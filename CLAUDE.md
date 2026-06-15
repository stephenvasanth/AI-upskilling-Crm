# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

A CRM web application for small teams: a Spring Boot 3 / Java 21 REST API
(`crm-service`) and an Angular 20 standalone/signals SPA (`crm-ui`), backed by
PostgreSQL and Redis, orchestrated via `docker-compose.yml`.

## Coding Standards (read before making changes)

- **Backend** (`crm-service/**`): follow [`crm-service/rules.md`](crm-service/rules.md) —
  project structure, naming, mandatory Javadoc, DTO/validation rules,
  exception handling, Redis caching strategy (including the
  `Collectors.toList()` vs `Stream.toList()` serialization pitfall in §8.5),
  transactions, logging, REST conventions, security, testing, and a
  self-review checklist.
- **Frontend** (`crm-ui/**`): follow [`crm-ui/rules.md`](crm-ui/rules.md) —
  standalone components + signals, reactive forms, routing/guards, error
  handling via interceptors, design-token usage, accessibility, and a
  self-review checklist.

Both files end with a "Self-Review Checklist" — run through it before
considering a change in that subproject done.

## Reference Documents (`docs/`)

- `docs/REQUIREMENTS.md` — functional/non-functional requirements (IDs like
  `CON-04`, `DEA-03`, `NFR-S04`), kept in sync with the implementation (see
  its "Sync note" for the latest reconciliation).
- `docs/DESIGN.md` — UI/UX design spec: design tokens, per-screen specs,
  reusable components, navigation, interaction patterns, accessibility.
- `docs/TECHNICAL_SPEC.md` — as-built technical specification: DB schema,
  JPA entities, full REST API reference, security, Redis caching, frontend
  architecture, deployment.
- `docs/implementation_plan_crm.md` — original high-level build plan
  (`crm-service/rules.md` §11 references its endpoint list for REST
  conventions).

`docs/CRM_Requirements.docx` and `docs/CRM_Design.docx` are Word copies
generated from `docs/REQUIREMENTS.md`/`docs/DESIGN.md` content by
`docs/scripts/generate-docs.js`. If you edit `REQUIREMENTS.md` or
`DESIGN.md`, mirror the change into `generate-docs.js` and regenerate:

```
cd docs/scripts && node generate-docs.js
```

## Running Locally

`docker-compose.yml` defines: `postgres` (host port 5433), `redis` (6380),
`pgadmin` (5050), `crm-service` (8093), `crm-ui` (4210).

**Important:** the existing containers/volumes were created under the compose
project name `crm`, not the directory-derived default (`ai-upskilling-crm`).
Always pass `-p crm`, e.g.:

```
docker compose -p crm up -d
docker compose -p crm logs -f crm-service
```

Default seeded login: `admin@crm.local` / `admin123` (ADMIN role).
