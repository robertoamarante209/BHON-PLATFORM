# SCHEMA.md

# BHON

## A clínica no controle.

---

# Visão Geral

A BHON utiliza arquitetura multi-tenant.

Toda entidade operacional deve possuir:

tenant_id

Nenhum dado pode ser compartilhado entre clínicas.

---

# Tenant

Representa uma clínica.

Campos:

- id
- name
- trade_name
- email
- phone
- status
- plan
- created_at
- updated_at

Relacionamentos:

- users
- patients
- opportunities
- tasks
- treatments
- quotes

---

# User

Representa um usuário da clínica.

Campos:

- id
- tenant_id
- name
- email
- password_hash
- role
- status
- last_login
- created_at
- updated_at

---

# Patient

Representa um paciente.

Campos:

- id
- tenant_id
- name
- phone
- email
- birth_date
- status
- source
- created_at
- updated_at

Relacionamentos:

- opportunities
- treatments
- quotes
- tasks

---

# Treatment

Representa um tratamento.

Campos:

- id
- tenant_id
- patient_id
- name
- description
- value
- status
- started_at
- completed_at
- created_at
- updated_at

Status:

- LEAD
- QUOTED
- PENDING
- SCHEDULED
- IN_PROGRESS
- PAUSED
- COMPLETED
- CANCELLED
- ABANDONED

---

# Quote

Representa um orçamento.

Campos:

- id
- tenant_id
- patient_id
- treatment_id
- value
- status
- sent_at
- expires_at
- created_at
- updated_at

Status:

- DRAFT
- SENT
- VIEWED
- NEGOTIATING
- ACCEPTED
- REJECTED
- EXPIRED
- NO_RESPONSE

---

# Opportunity

Entidade principal da BHON.

Campos:

- id
- tenant_id
- patient_id
- type
- score
- priority
- reason
- status
- estimated_value
- next_action
- 
