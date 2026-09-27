import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { Prisma } from "@prisma/client";

const migrationsDirectory = fileURLToPath(new URL("../prisma/migrations/", import.meta.url));
const schemaPath = fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url));
const migrations = (await readdir(migrationsDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const database = new PGlite();
let migrationFailed = false;

try {
  for (const migration of migrations) {
    const sql = await readFile(join(migrationsDirectory, migration, "migration.sql"), "utf8");
    try {
      await database.exec(sql);
      console.log(`ok ${migration}`);
    } catch (error) {
      console.error(`failed ${migration}: ${error.message}`);
      migrationFailed = true;
      break;
    }
  }

  const columns = await database.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `);
  const actualColumns = new Set(columns.rows.map(({ table_name, column_name }) => `${table_name}.${column_name}`));
  const missingColumns = [];
  const extraColumns = new Set(actualColumns);
  for (const model of Prisma.dmmf.datamodel.models) {
    const table = model.dbName || model.name;
    for (const field of model.fields.filter((field) => field.kind !== "object")) {
      const column = field.dbName || field.name;
      const key = `${table}.${column}`;
      if (!actualColumns.has(key)) missingColumns.push(key);
      extraColumns.delete(key);
    }
  }

  const enumRows = await database.query(`
    SELECT t.typname AS enum_name, e.enumlabel AS enum_value
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
  `);
  const actualEnums = new Map();
  for (const row of enumRows.rows) {
    const values = actualEnums.get(row.enum_name) || [];
    values.push(row.enum_value);
    actualEnums.set(row.enum_name, values);
  }
  const enumDifferences = [];
  const schema = await readFile(schemaPath, "utf8");
  const expectedEnums = [...schema.matchAll(/enum\s+(\w+)\s*\{([\s\S]*?)\}/g)].map((match) => ({
    name: match[1],
    values: match[2]
      .split(/\r?\n/)
      .map((line) => line.replace(/\/\/.*$/, "").trim().split(/\s+/)[0])
      .filter(Boolean),
  }));
  for (const value of expectedEnums) {
    const name = value.name;
    const expected = value.values;
    const actual = actualEnums.get(name) || [];
    const missing = expected.filter((entry) => !actual.includes(entry));
    const extra = actual.filter((entry) => !expected.includes(entry));
    if (missing.length || extra.length) enumDifferences.push({ name, missing, extra });
  }

  const rlsRows = await database.query(`
    SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  `);
  const rlsByTable = new Map(rlsRows.rows.map(({ table_name, rls_enabled }) => [table_name, rls_enabled]));
  const missingRlsTables = Prisma.dmmf.datamodel.models
    .map((model) => model.dbName || model.name)
    .filter((tableName) => !rlsByTable.get(tableName));
  const triggerFunctionRows = await database.query(`
    SELECT p.proname, COALESCE(array_to_string(p.proconfig, ','), '') AS configuration
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('prevent_communication_event_update', 'prevent_communication_event_delete')
  `);
  const unhardenedTriggerFunctions = triggerFunctionRows.rows
    .filter(({ configuration }) => !configuration.includes('search_path=pg_catalog'))
    .map(({ proname }) => proname);

  console.log(JSON.stringify({ missingColumns, extraColumns: [...extraColumns].sort(), enumDifferences, missingRlsTables, unhardenedTriggerFunctions }, null, 2));
  if (missingRlsTables.length) {
    throw new Error(`RLS ausente em: ${missingRlsTables.join(", ")}`);
  }
  if (unhardenedTriggerFunctions.length) {
    throw new Error(`Função de auditoria sem search_path fixo: ${unhardenedTriggerFunctions.join(", ")}`);
  }
  if (migrationFailed || missingColumns.length || extraColumns.size || enumDifferences.length || missingRlsTables.length) {
    process.exitCode = 1;
  }
} finally {
  await database.close();
}

