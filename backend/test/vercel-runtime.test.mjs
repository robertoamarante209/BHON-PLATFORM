import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";

test("o servidor escuta apenas quando o runtime administra uma porta", async () => {
  const { shouldListen } = await import("../src/domain/runtime.ts");

  assert.equal(shouldListen({}), true);
  assert.equal(shouldListen({ VERCEL: "1" }), false);
  assert.equal(shouldListen({ VERCEL: "1", BHON_CONTAINER: "1" }), true);
});

test("o artefato do backend pode ser carregado pelo runtime CommonJS da Vercel", () => {
  execFileSync(process.execPath, ["./node_modules/typescript/bin/tsc"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });

  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "const app = require('./dist/server.js').default; app.ready().then(() => app.inject({ method: 'GET', url: '/api/patients' })).then((response) => { if (response.statusCode !== 401) throw new Error('unexpected status ' + response.statusCode); process.stdout.write('ok'); return app.close(); }).catch((error) => { console.error(error); process.exit(1); })",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        VERCEL: "1",
        DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/bhon",
        COOKIE_SECRET: "test-cookie-secret-with-at-least-32-characters",
        CORS_ORIGINS: "https://bhon-platform.vercel.app",
      },
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /(?:^|\n)ok/);
});
