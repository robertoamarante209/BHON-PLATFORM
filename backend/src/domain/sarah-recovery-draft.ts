type RecoveryDraftDatabase = {
  opportunity: { findFirst: (args: any) => any };
  secretaryConversation: { create: (args: any) => Promise<{ id: string }> };
  secretaryMessage: { create: (args: any) => Promise<unknown> };
};

export async function createSarahRecoveryDraft(database: RecoveryDraftDatabase, input: { tenantId: string; opportunityId: string }) {
  const opportunity = await database.opportunity.findFirst({
    where: { id: input.opportunityId, tenantId: input.tenantId, deletedAt: null },
    include: { patient: { select: { id: true, name: true, phone: true } } },
  });
  if (!opportunity || !opportunity.patient.phone) throw new Error("RECOVERY_DRAFT_PATIENT_UNAVAILABLE");

  const conversation = await database.secretaryConversation.create({
    data: {
      tenantId: input.tenantId,
      patientId: opportunity.patient.id,
      contactName: opportunity.patient.name,
      contactPhone: opportunity.patient.phone,
      lastIntent: "RECOVERY_DRAFT",
    },
  });
  await database.secretaryMessage.create({
    data: {
      conversationId: conversation.id,
      direction: "SYSTEM",
      channel: "DASHBOARD",
      intent: "RECOVERY_DRAFT",
      action: "PREPARE_ONLY",
      actionStatus: "REQUIRES_HUMAN_REVIEW",
      content: `Rascunho de recuperação preparado para ${opportunity.patient.name}. Revise antes de qualquer envio.`,
    },
  });
  return { conversationId: conversation.id };
}
