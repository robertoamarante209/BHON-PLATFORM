# ARCHITECTURE.md

# BHON

## A clínica no controle.

## Objetivo

Definir a arquitetura técnica da plataforma BHON.

A arquitetura deve ser:

- Multi-tenant
- Escalável
- Segura
- Modular
- Preparada para milhares de clínicas

---

# Stack Oficial

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

## Backend

- NestJS
- TypeScript

## Banco de Dados

- PostgreSQL

## ORM

- Prisma

## Cache

- Redis

## Filas

- BullMQ

## Infraestrutura

- Docker
- Azure

---

# Estrutura da aplicação

/apps

- web
- api

/packages

- ui
- database
- auth
- shared
- types

/docs

- BRAND
- PRODUCT
- DATABASE
- ARCHITECTURE
- ROADMAP

---

# Módulos

## Auth

Responsável por:

- Login
- Logout
- Recuperação de senha
- MFA
- Sessões

## Tenants

Responsável por:

- Clínicas
- Configurações
- Planos

## Users

Responsável por:

- Usuários
- Perfis
- Permissões

## Patients

Responsável por:

- Cadastro
- Busca
- Histórico

## Opportunities

Responsável por:

- Oportunidades
- Priorização
- Score

## Tasks

Responsável por:

- Ações
- Follow-up
- Responsáveis

---

# Regra Principal

Todo registro operacional deve possuir:

tenant_id

Não é permitido acesso cruzado entre clínicas.

---

# Dashboard

Pergunta principal:

Quem precisa da minha atenção hoje?

Objetivo:

Transformar:

Dado → Contexto → Oportunidade → Ação → Resultado

---

# Segurança

- HTTPS obrigatório
- Hash seguro de senhas
- MFA
- Auditoria
- Controle de acesso
- Logs de segurança
- Proteção contra acesso entre tenants

---

# Escalabilidade

A arquitetura deve suportar:

- milhares de clínicas
- milhões de pacientes
- milhões de oportunidades
- processamento assíncrono
- crescimento horizontal

---

# Princípio Final

A BHON não é um CRM.

A BHON é a camada operacional da clínica.

BHON.

A clínica no controle.
