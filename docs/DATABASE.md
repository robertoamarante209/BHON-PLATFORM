# DATABASE.md

# BHON

## A clínica no controle.

## Objetivo

Este documento define a estrutura inicial do banco de dados da BHON.

A arquitetura deve ser multi-tenant, segura, escalável e preparada para milhares de clínicas.

---

# Entidades MVP

## Tenant

Representa uma clínica.

Campos:

- id
- name
- trade_name
- email
- phone
- plan
- status
- created_at
- updated_at

---

## User

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

## Patient

Representa um paciente.

Campos:

- id
- tenant_id
- name
- phone
- email
- status
- source
- created_at
- updated_at

---

## Opportunity

Representa uma oportunidade identificada pela BHON.

Campos:

- id
- tenant_id
- patient_id
- type
- score
- priority
- reason
- status
- next_action
- created_at
- updated_at

---

# Regra de Segurança

Nenhum usuário pode acessar registros de outro tenant.

Todo registro operacional deve possuir tenant_id.

---

# Missão do Produto

Transformar:

Dado → Contexto → Oportunidade → Ação → Resultado

Pergunta principal:

Quem precisa da minha atenção hoje?
