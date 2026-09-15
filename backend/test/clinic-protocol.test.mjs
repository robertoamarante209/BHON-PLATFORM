import assert from "node:assert/strict";
import test from "node:test";
import { parseClinicProtocol } from "../src/domain/clinic-protocol.ts";

test("normaliza um protocolo operacional com etapas ordenadas", () => {
  assert.deepEqual(parseClinicProtocol({
    title: "  Retorno preventivo ",
    description: "  Organiza a rotina da equipe. ",
    steps: [" Confirmar presença ", " Registrar retorno "],
  }), {
    ok: true,
    value: {
      title: "Retorno preventivo",
      description: "Organiza a rotina da equipe.",
      steps: ["Confirmar presença", "Registrar retorno"],
    },
  });
});

test("rejeita protocolos sem título ou etapas úteis", () => {
  assert.deepEqual(parseClinicProtocol({ title: " ", steps: ["Contato"] }), { ok: false, code: "INVALID_PROTOCOL_TITLE" });
  assert.deepEqual(parseClinicProtocol({ title: "Retorno", steps: [" "] }), { ok: false, code: "INVALID_PROTOCOL_STEPS" });
});
