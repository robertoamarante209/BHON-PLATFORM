# PRISMA_SCHEMA.md

# BHON

## A clínica no controle.

---

# Objetivo

Este documento representa a estrutura inicial do banco de dados da BHON utilizando a modelagem do Prisma ORM.

O objetivo é servir como ponte entre:

* Modelo conceitual
* Banco PostgreSQL
* Prisma ORM
* Backend NestJS

Este arquivo ainda é documentação.

A implementação real do Prisma será realizada posteriormente em:

```text
backend/prisma/schema.prisma
```

---

# Princípios

A arquitetura do banco deve seguir os seguintes princípios:

* Multi-tenant
* Isolamento absoluto entre clínicas
* Segurança
* Auditabilidade
* Integridade referencial
* Escalabilidade
* Identificadores únicos
* Timestamps padronizados
* Soft delete quando necessário

---

# Database

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

---

# Enums

## TenantStatus

```prisma
enum TenantStatus {
  ACTIVE
  SUSPENDED
  CANCELLED
}
```

## UserRole

```prisma
enum UserRole {
  OWNER
  ADMIN
  MANAGER
  DENTIST
  RECEPTIONIST
  FINANCIAL
  VIEWER
}
```

## UserStatus

```prisma
enum UserStatus {
  ACTIVE
  INACTIVE
  BLOCKED
}
```

## TreatmentStatus

```prisma
enum TreatmentStatus {
  LEAD
  QUOTED
  PENDING
  SCHEDULED
  IN_PROGRESS
  PAUSED
  COMPLETED
  CANCELLED
  ABANDONED
}
```

## QuoteStatus

```prisma
enum QuoteStatus {
  DRAFT
  SENT
  VIEWED
  NEGOTIATING
  ACCEPTED
  REJECTED
  EXPIRED
  NO_RESPONSE
}
```

## OpportunityType

```prisma
enum OpportunityType {
  NO_RETURN
  MISSED_APPOINTMENT
  UNPAID_QUOTE
  ABANDONED_TREATMENT
  FOLLOW_UP
  REACTIVATION
}
```

## OpportunityStatus

```prisma
enum OpportunityStatus {
  NEW
  IN_PROGRESS
  WAITING
  CONVERTED
  LOST
  DISMISSED
}
```

## Priority

```prisma
enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

## TaskStatus

```prisma
enum TaskStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

---

# Tenant

Representa uma clínica dentro da plataforma.

```prisma
model Tenant {
  id          String       @id @default(uuid())
  name        String
  tradeName   String?      @map("trade_name")
  email       String
  phone       String?
  status      TenantStatus @default(ACTIVE)
  plan        String?

  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")

  users          User[]
  patients       Patient[]
  treatments     Treatment[]
  quotes         Quote[]
  opportunities  Opportunity[]
  tasks          Task[]
  timelineEvents TimelineEvent[]
  auditLogs      AuditLog[]

  @@index([status])
  @@map("tenants")
}
```

---

# User

Representa um usuário pertencente a uma clínica.

```prisma
model User {
  id           String     @id @default(uuid())
  tenantId     String     @map("tenant_id")

  name         String
  email        String
  passwordHash String     @map("password_hash")

  role         UserRole   @default(VIEWER)
  status       UserStatus @default(ACTIVE)

  lastLogin    DateTime?  @map("last_login")

  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  tenant       Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  assignedTasks Task[]

  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([tenantId, status])
  @@map("users")
}
```

---

# Patient

Representa o paciente da clínica.

```prisma
model Patient {
  id        String    @id @default(uuid())
  tenantId  String    @map("tenant_id")

  name      String
  phone     String?
  email     String?
  birthDate DateTime? @map("birth_date")

  status    String?
  source    String?

  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  tenant         Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  treatments     Treatment[]
  quotes         Quote[]
  opportunities  Opportunity[]
  tasks          Task[]
  timelineEvents TimelineEvent[]

  @@index([tenantId])
  @@index([tenantId, phone])
  @@index([tenantId, email])
  @@map("patients")
}
```

---

# Treatment

Representa um tratamento realizado ou planejado para o paciente.

```prisma
model Treatment {
  id          String          @id @default(uuid())
  tenantId    String          @map("tenant_id")
  patientId   String          @map("patient_id")

  name        String
  description String?

  value       Decimal?        @db.Decimal(12, 2)
  status      TreatmentStatus @default(LEAD)

  startedAt   DateTime?       @map("started_at")
  completedAt DateTime?       @map("completed_at")

  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt @map("updated_at")

  tenant      Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  patient     Patient         @relation(fields: [patientId], references: [id], onDelete: Cascade)

  quotes      Quote[]

  @@index([tenantId])
  @@index([tenantId, patientId])
  @@index([tenantId, status])
  @@map("treatments")
}
```

---

# Quote

Representa um orçamento enviado ou criado para o paciente.

```prisma
model Quote {
  id          String       @id @default(uuid())
  tenantId    String       @map("tenant_id")
  patientId   String       @map("patient_id")
  treatmentId String?      @map("treatment_id")

  value       Decimal      @db.Decimal(12, 2)
  status      QuoteStatus  @default(DRAFT)

  sentAt      DateTime?    @map("sent_at")
  expiresAt   DateTime?    @map("expires_at")

  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")

  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  patient     Patient      @relation(fields: [patientId], references: [id], onDelete: Cascade)
  treatment   Treatment?   @relation(fields: [treatmentId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([tenantId, patientId])
  @@index([tenantId, status])
  @@map("quotes")
}
```

---

# Opportunity

Uma das entidades centrais da BHON.

Representa uma situação que exige atenção da equipe.

```prisma
model Opportunity {
  id             String            @id @default(uuid())
  tenantId       String            @map("tenant_id")
  patientId      String            @map("patient_id")

  type           OpportunityType
  score          Int?
  priority       Priority          @default(MEDIUM)

  reason         String?
  status         OpportunityStatus @default(NEW)

  estimatedValue Decimal?          @map("estimated_value") @db.Decimal(12, 2)

  nextAction     String?           @map("next_action")
  nextActionAt   DateTime?         @map("next_action_at")

  createdAt      DateTime          @default(now()) @map("created_at")
  updatedAt      DateTime          @updatedAt @map("updated_at")

  tenant         Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  patient        Patient           @relation(fields: [patientId], references: [id], onDelete: Cascade)

  tasks          Task[]

  @@index([tenantId])
  @@index([tenantId, patientId])
  @@index([tenantId, status])
  @@index([tenantId, priority])
  @@index([tenantId, nextActionAt])
  @@map("opportunities")
}
```

---

# Task

Representa uma ação que precisa ser executada pela equipe.

```prisma
model Task {
  id             String      @id @default(uuid())
  tenantId       String      @map("tenant_id")
  patientId      String?     @map("patient_id")
  opportunityId  String?     @map("opportunity_id")

  assignedTo     String?     @map("assigned_to")

  description    String
  priority       Priority    @default(MEDIUM)
  dueDate        DateTime?   @map("due_date")

  status         TaskStatus  @default(OPEN)
  completedAt    DateTime?   @map("completed_at")

  createdAt      DateTime    @default(now()) @map("created_at")
  updatedAt      DateTime    @updatedAt @map("updated_at")

  tenant         Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  patient        Patient?    @relation(fields: [patientId], references: [id], onDelete: SetNull)
  opportunity    Opportunity? @relation(fields: [opportunityId], references: [id], onDelete: SetNull)
  assignee       User?       @relation(fields: [assignedTo], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([tenantId, status])
  @@index([tenantId, dueDate])
  @@index([tenantId, assignedTo])
  @@map("tasks")
}
```

---

# TimelineEvent

Histórico operacional do paciente.

```prisma
model TimelineEvent {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id")
  patientId   String   @map("patient_id")

  type        String
  description String

  createdAt   DateTime @default(now()) @map("created_at")

  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tenantId, patientId])
  @@index([tenantId, createdAt])
  @@map("timeline_events")
}
```

---

# AuditLog

Registro de ações realizadas dentro da plataforma.

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  tenantId   String   @map("tenant_id")

  actor      String?
  action     String
  resource   String
  resourceId String?  @map("resource_id")

  ip         String?
  userAgent  String?  @map("user_agent")

  createdAt  DateTime @default(now()) @map("created_at")

  tenant     Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tenantId, resource])
  @@index([tenantId, createdAt])
  @@map("audit_logs")
}
```

---

# Regra de Multi-Tenancy

Toda consulta realizada pelo backend deverá estar vinculada ao `tenantId` do usuário autenticado.

Exemplo conceitual:

```text
Usuário
   ↓
Tenant
   ↓
Dados da clínica
```

Nunca permitir:

```text
Usuário A
   ↓
Dados da Clínica B
```

O isolamento entre tenants é uma regra fundamental da BHON.

---

# Regra de Segurança

O `tenantId` nunca deve ser confiado diretamente a dados enviados pelo frontend.

O backend deve determinar o tenant através do contexto de autenticação.

Exemplo:

```text
JWT
 ↓
User ID
 ↓
User
 ↓
Tenant ID
 ↓
Consulta filtrada
```

---

# Regra Fundamental da BHON

O banco de dados não deve existir apenas para armazenar informações.

Ele deve permitir que a plataforma responda:

> Quem precisa da minha atenção hoje?

A estrutura de:

* Patients
* Treatments
* Quotes
* Opportunities
* Tasks
* TimelineEvents
* AuditLogs

deve sustentar essa visão.

---

# Próxima Implementação

Quando a fase de documentação estiver concluída, este modelo deverá ser convertido para:

```text
backend/
└── prisma/
    └── schema.prisma
```

Posteriormente serão implementados:

* migrations
* índices
* constraints
* seed
* autenticação
* autorização
* isolamento multi-tenant
* auditoria
* testes de integridade
* backup
* observabilidade

