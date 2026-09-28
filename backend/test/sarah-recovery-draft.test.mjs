import assert from "node:assert/strict";
import test from "node:test";

const { createSarahRecoveryDraft } = await import("../src/domain/sarah-recovery-draft.ts");

test("não cria conversa da Sarah quando o WhatsApp foi recusado", async () => {
  let conversations = 0;
  const db = {
    opportunity: { findFirst: async () => ({ id: "opportunity-a", patient: { id: "patient-a", name: "Ana", phone: "+5511999999999" } }) },
    patientContactPreference: { findUnique: async () => ({ whatsapp: "REFUSED" }) },
    secretaryConversation: { create: async () => { conversations += 1; return { id: "conversation-a" }; } },
    secretaryMessage: { create: async () => ({}) },
  };

  await assert.rejects(
    () => createSarahRecoveryDraft(db, { tenantId: "tenant-a", opportunityId: "opportunity-a" }),
    (error) => error instanceof Error && error.message === "SARAH_CONTACT_CHANNEL_REFUSED",
  );
  assert.equal(conversations, 0);
});
