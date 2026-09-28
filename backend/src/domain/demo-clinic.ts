type DemoDatabase = {
  patient: { count: (args: any) => Promise<number>; create: (args: any) => Promise<{ id: string }>; deleteMany: (args: any) => Promise<unknown> };
  opportunity: { count: (args: any) => Promise<number>; create: (args: any) => Promise<{ id: string }>; deleteMany: (args: any) => Promise<unknown> };
  appointment: { count: (args: any) => Promise<number>; deleteMany: (args: any) => Promise<unknown> };
  followUp: { create: (args: any) => Promise<{ id: string }>; deleteMany: (args: any) => Promise<unknown> };
  demoDataLot: { create: (args: any) => Promise<{ id: string }>; findFirst: (args: any) => Promise<{ id: string; tenantId: string } | null>; delete: (args: any) => Promise<unknown> };
};

export async function loadDemoClinic(database: DemoDatabase, tenantId: string, actorUserId: string) {
  const [patients, opportunities, appointments] = await Promise.all([
    database.patient.count({ where: { tenantId, deletedAt: null } }),
    database.opportunity.count({ where: { tenantId, deletedAt: null } }),
    database.appointment.count({ where: { tenantId } }),
  ]);
  if (patients > 0 || opportunities > 0 || appointments > 0) throw new Error("DEMO_REQUIRES_EMPTY_CLINIC");

  const lot = await database.demoDataLot.create({ data: { tenantId, createdByUserId: actorUserId } });
  const patient = await database.patient.create({ data: {
    tenantId, demoLotId: lot.id, recordNumber: "DEMO-001", name: "Paciente de demonstração", source: "BHON_DEMO",
  } });
  const opportunity = await database.opportunity.create({ data: {
    tenantId, demoLotId: lot.id, patientId: patient.id, type: "REATIVACAO", status: "ORCAMENTO", priority: "HIGH",
    source: "BHON_DEMO", potentialValue: "1800.00", daysInactive: 21,
    nextStep: "Preparar uma mensagem de retorno com a Anna.",
  } });
  await database.followUp.create({ data: {
    tenantId, demoLotId: lot.id, patientId: patient.id, category: "ORCAMENTO", reason: "Demonstração de recuperação de orçamento",
    priority: "HIGH", status: "PENDENTE", deadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    nextAction: "Revisar mensagem sugerida com a Anna.",
  } });

  return { demoLotId: lot.id, patientId: patient.id, opportunityId: opportunity.id };
}

export async function removeDemoClinic(database: DemoDatabase, tenantId: string, _actorUserId: string) {
  const lot = await database.demoDataLot.findFirst({ where: { tenantId } });
  if (!lot) throw new Error("DEMO_NOT_FOUND");
  const where = { tenantId, demoLotId: lot.id };
  await database.followUp.deleteMany({ where });
  await database.appointment.deleteMany({ where });
  await database.opportunity.deleteMany({ where });
  await database.patient.deleteMany({ where });
  await database.demoDataLot.delete({ where: { id: lot.id } });
  return { demoLotId: lot.id };
}
