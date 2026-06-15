# CRM Application — Technical Specification

**Version:** 1.0
**Date:** 2026-06-15
**Status:** Reflects the current implementation in `crm-service/` and `crm-ui/`

This document describes the system **as built**. For product requirements see
`docs/REQUIREMENTS.md`; for UI/visual design see `docs/DESIGN.md`; for the
original build plan see `docs/implementation_plan_crm.md`.

---

## 1. Overview

The CRM is a two-tier web application:

- **`crm-service`** — a Spring Boot 3 REST API (Java 21) backed by PostgreSQL,
  with Redis-backed read-through caching and JWT-based stateless
  authentication.
- **`crm-ui`** — an Angular 20 single-page application (standalone components
  + signals, Angular Material) that consumes the REST API.

Both services, plus PostgreSQL, Redis, and pgAdmin, are orchestrated via
`docker-compose.yml` for local development.

### 1.1 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend language/runtime | Java | 21 |
| Backend framework | Spring Boot | 3.3.5 |
| ORM | Spring Data JPA (Hibernate) | 6.5.3 |
| Database | PostgreSQL | 16 |
| Migrations | Flyway | 10.10.0 |
| Cache | Redis (Spring Data Redis / Lettuce) | 7 (alpine) |
| Auth | Spring Security 6 + JJWT | 6.3.4 / 0.12.6 |
| Build (backend) | Maven | 3.9 |
| Frontend framework | Angular (standalone + signals) | 20.3 |
| UI library | Angular Material | 20.2 |
| Language | TypeScript | 5.9 |
| Build (frontend) | Angular CLI / esbuild+vite dev server | — |

### 1.2 High-Level Architecture

```
┌───────────────────┐        HTTPS/JSON         ┌────────────────────────┐
│  crm-ui (Angular) │ ─────────────────────────▶ │ crm-service (Spring)   │
│  :4210            │ ◀───────────────────────── │ :8093                  │
└───────────────────┘     Authorization: Bearer  └────────┬───────┬───────┘
                                  <JWT>                     │       │
                                                  JDBC       │       │ Redis
                                              ┌──────────────▼┐   ┌──▼──────┐
                                              │ PostgreSQL :5432 (host 5433)│
                                              │              │   │ Redis    │
                                              └──────────────┘   │ :6379    │
                                                                  │ (host    │
                                                                  │  6380)   │
                                                                  └──────────┘
```

`pgAdmin` (host port `5050`) is provided for DB inspection only — it is not
part of the application's runtime data path.

---

## 2. Backend (`crm-service`)

### 2.1 Project Structure

```
crm-service/src/main/java/com/crm/
├── CrmApplication.java
├── config/        SecurityConfig, RedisConfig, CacheNames
├── security/       JwtUtil, JwtAuthenticationFilter, UserDetailsServiceImpl,
│                    CurrentUserProvider, RestAuthenticationEntryPoint,
│                    RestAccessDeniedHandler, SecurityResponseWriter
├── entity/         BaseEntity, AuditableEntity, User, Company, Contact, Tag,
│                    Deal, Activity, Task, + enums (UserRole, ActivityType,
│                    DealStage)
├── repository/      one Spring Data JpaRepository per entity
├── dto/            request/response DTOs (never expose entities over REST)
├── service/        AuthService, UserService, CompanyService, ContactService,
│                    TagService, DealService, ActivityService, TaskService
├── controller/     AuthController, UserController, CompanyController,
│                    ContactController, TagController, DealController,
│                    ActivityController, TaskController
└── exception/      ResourceNotFoundException, ConflictException,
                     GlobalExceptionHandler
```

### 2.2 Configuration

`src/main/resources/application.yml`:

| Property | Default (local dev) | Notes |
|---|---|---|
| `server.port` | `8093` | |
| `spring.datasource.url` | `jdbc:postgresql://localhost:5433/crmdb` | overridden to `postgres:5432` inside Docker |
| `spring.datasource.username` / `password` | `crm` / `crm_password` | |
| `spring.jpa.hibernate.ddl-auto` | `validate` | schema is owned by Flyway, Hibernate only validates |
| `spring.flyway.locations` | `classpath:db/migration` | runs `V1`–`V8` on startup |
| `spring.data.redis.host` / `port` | `localhost` / `6380` | overridden to `redis:6379` inside Docker |
| `spring.cache.type` | `redis` | |
| `jwt.secret` | `${JWT_SECRET:<base64 dev default>}` | **must** be overridden via `JWT_SECRET` env var outside local dev |
| `jwt.expiration-ms` | `86400000` (24h) | |
| `cors.allowed-origins` | `${CORS_ALLOWED_ORIGINS:http://localhost:4210}` | comma-separated list |

### 2.3 Domain Model

#### 2.3.1 Entity-Relationship Overview

```
User ──< owns >────────────── Contact ──< belongs to >── Company
  │  ──< owns >────────────── Deal ─────< for >────────── Contact
  │  ──< assigned >────────── Task ─────< about >──────── Contact / Deal
  │  ──< authors >─────────── Activity ─< about >──────── Contact / Deal
  │  ──< creates >─────────── Tag, Company
  └──< member of (M:N) >───── Tag ───────< tags >───────── Contact
```

- A **Contact** has exactly one **owner** (User) and an optional **Company**.
- A **Deal** has exactly one **owner** (User) and an optional **Contact**.
- A **Task** has exactly one **assignee** (User) and optional **Contact**/**Deal** links.
- An **Activity** has exactly one author (`createdBy`, User) and must reference
  **at least one** of Contact/Deal (enforced in the service layer, not the DB).
- **Contact ↔ Tag** is many-to-many via `contact_tags`.

#### 2.3.2 Base Classes

| Class | Fields | Used by |
|---|---|---|
| `BaseEntity` (mapped superclass) | `id: Long` (`@Id @GeneratedValue(IDENTITY)`), `createdAt: Instant` (`@CreationTimestamp`) | all entities |
| `AuditableEntity extends BaseEntity` | + `updatedAt: Instant` (`@UpdateTimestamp`) | `User`, `Company`, `Contact`, `Deal`, `Task` (not `Tag`/`Activity`, which are immutable after creation) |

#### 2.3.3 Enums

| Enum | Values |
|---|---|
| `UserRole` | `ADMIN`, `USER` |
| `ActivityType` | `CALL`, `EMAIL`, `MEETING`, `NOTE` |
| `DealStage` | `LEAD`, `QUALIFIED`, `PROPOSAL`, `NEGOTIATION`, `CLOSED_WON`, `CLOSED_LOST` (pipeline order) |

#### 2.3.4 Entities

**User** (`users`, extends `AuditableEntity`)
| Field | Type | Notes |
|---|---|---|
| firstName, lastName | String(100) | not null |
| email | String(255) | not null, unique (`uq_users_email`) |
| passwordHash | String(255) | BCrypt(12), never exposed |
| role | `UserRole` (string) | not null, default `USER` |
| active | boolean | not null, default `true` |

**Company** (`companies`, extends `AuditableEntity`)
| Field | Type | Notes |
|---|---|---|
| name | String(255) | not null |
| industry, website, phone | String | nullable |
| address | String(500) | nullable |
| createdBy | `User` (`@ManyToOne`, FK `created_by`) | nullable, `ON DELETE SET NULL` |

**Contact** (`contacts`, extends `AuditableEntity`)
| Field | Type | Notes |
|---|---|---|
| firstName, lastName | String(100) | not null |
| email | String(255) | nullable |
| phone | String(50) | nullable |
| title | String(150) | nullable |
| company | `Company` (`@ManyToOne`, FK `company_id`) | nullable, `ON DELETE SET NULL` |
| owner | `User` (`@ManyToOne`, FK `owner_id`) | not null |
| tags | `Set<Tag>` (`@ManyToMany` via `contact_tags`) | lazy, `HashSet` |

**Tag** (`tags`, extends `BaseEntity` — no `updatedAt`)
| Field | Type | Notes |
|---|---|---|
| name | String(50) | not null, unique (`uq_tags_name`) |
| color | String(7) | not null, hex e.g. `#4F46E5` |
| createdBy | `User` (`@ManyToOne`, FK `created_by`) | nullable, `ON DELETE SET NULL` |

**Deal** (`deals`, extends `AuditableEntity`)
| Field | Type | Notes |
|---|---|---|
| title | String(255) | not null |
| value | `BigDecimal(14,2)` | not null, default `0`, `CHECK (value >= 0)` |
| stage | `DealStage` (string) | not null, default `LEAD` |
| closeDate | `LocalDate` | nullable |
| contact | `Contact` (`@ManyToOne`, FK `contact_id`) | nullable, `ON DELETE SET NULL` |
| owner | `User` (`@ManyToOne`, FK `owner_id`) | not null |

**Activity** (`activities`, extends `BaseEntity` — no `updatedAt`)
| Field | Type | Notes |
|---|---|---|
| type | `ActivityType` (string) | not null |
| subject | String(255) | not null |
| body | `TEXT` | nullable |
| contact | `Contact` (`@ManyToOne`, FK `contact_id`) | nullable, `ON DELETE CASCADE` |
| deal | `Deal` (`@ManyToOne`, FK `deal_id`) | nullable, `ON DELETE CASCADE` |
| createdBy | `User` (`@ManyToOne`, FK `created_by`) | not null |

> At least one of `contact`/`deal` must be set — enforced in `ActivityService`,
> not a DB constraint.

**Task** (`tasks`, extends `AuditableEntity`)
| Field | Type | Notes |
|---|---|---|
| title | String(255) | not null |
| description | `TEXT` | nullable |
| dueDate | `LocalDate` | nullable |
| completed | boolean | not null, default `false` |
| contact | `Contact` (`@ManyToOne`, FK `contact_id`) | nullable, `ON DELETE SET NULL` |
| deal | `Deal` (`@ManyToOne`, FK `deal_id`) | nullable, `ON DELETE SET NULL` |
| assignee | `User` (`@ManyToOne`, FK `assignee_id`) | not null |

### 2.4 Database Schema (Flyway Migrations)

| Migration | Table(s) | Purpose |
|---|---|---|
| `V1__create_users_table.sql` | `users` | App users; `role` CHECK in (`ADMIN`,`USER`); unique `email` |
| `V2__create_companies_table.sql` | `companies` | Organisations; index on `name` |
| `V3__create_contacts_table.sql` | `contacts` | People; indexes on `company_id`, `owner_id`, `email`, `(last_name, first_name)` |
| `V4__create_tags_table.sql` | `tags`, `contact_tags` | Tags + M:N join (composite PK `contact_id,tag_id`, both FKs `ON DELETE CASCADE`); unique `tags.name`; index on `contact_tags.tag_id` |
| `V5__create_deals_table.sql` | `deals` | Pipeline opportunities; `stage` CHECK across the 6 `DealStage` values; `value CHECK (>= 0)`; indexes on `stage`, `contact_id`, `owner_id` |
| `V6__create_activities_table.sql` | `activities` | Interaction log; `type` CHECK in (`CALL`,`EMAIL`,`MEETING`,`NOTE`); FKs to `contacts`/`deals` `ON DELETE CASCADE`; indexes on `contact_id`, `deal_id`, `created_at DESC` |
| `V7__create_tasks_table.sql` | `tasks` | To-dos; indexes on `assignee_id`, `due_date`, `contact_id`, `deal_id`, `completed` |
| `V8__seed_admin_user.sql` | `users` (data) | Seeds `admin@crm.local` / `admin123` (BCrypt strength 12, role `ADMIN`) |

All tables use `BIGSERIAL` primary keys and `TIMESTAMPTZ` audit columns
(`created_at` / `updated_at`, default `now()`).

### 2.5 Security

#### 2.5.1 JWT Authentication Flow

1. `POST /api/auth/login` (public) — `AuthenticationManager` verifies the
   submitted password against the stored BCrypt hash.
2. On success, `JwtUtil.generateToken(email)` issues an HS256 JWT:
   - `sub` = user email
   - `iat` = now
   - `exp` = now + `jwt.expiration-ms` (24h default)
   - signed with `jwt.secret` (base64; **override via `JWT_SECRET` outside dev**)
3. The client sends `Authorization: Bearer <token>` on every subsequent
   request.
4. `JwtAuthenticationFilter` (registered before
   `UsernamePasswordAuthenticationFilter`) validates the token, loads the
   `User` via `UserDetailsServiceImpl` (by email), and populates
   `SecurityContextHolder`. Invalid/missing/expired tokens leave the request
   unauthenticated — endpoint-level checks then return 401/403.

#### 2.5.2 Authorization

- `UserDetailsServiceImpl` maps `UserRole.ADMIN` → `ROLE_ADMIN`,
  `UserRole.USER` → `ROLE_USER`, and marks the account disabled if
  `User.active == false`.
- Method-level `@PreAuthorize("hasRole('ADMIN')")` guards admin-only endpoints
  (see §2.6 for the full list).
- `CurrentUserProvider` resolves the authenticated `User` entity from the
  security context — used to stamp `createdBy` (Tag, Activity) and similar
  audit fields.

#### 2.5.3 Error Responses for Auth Failures

- **401** — `RestAuthenticationEntryPoint` writes the standard JSON error
  shape (see §2.7) with `error: "Unauthorized"`.
- **403** — `RestAccessDeniedHandler` writes the same shape with
  `error: "Forbidden"`.

#### 2.5.4 CORS & Transport

- CORS allowed origins come from `cors.allowed-origins` (default
  `http://localhost:4210`), methods `GET,POST,PUT,PATCH,DELETE,OPTIONS`,
  headers `Authorization,Content-Type`, applied to `/api/**`.
- Session management is stateless (`SessionCreationPolicy.STATELESS`); CSRF
  is disabled (no cookies/session state to protect).
- Passwords are hashed with `BCryptPasswordEncoder(12)` and never returned in
  any DTO or logged.

#### 2.5.5 Endpoint Access Summary

| Access level | Endpoints |
|---|---|
| Public | `POST /api/auth/login` |
| Authenticated (any role) | everything else under `/api/**` |
| `ADMIN` only | `POST /api/auth/register`, `PUT /api/users/{id}`, `POST /api/tags`, `DELETE /api/tags/{id}` |

### 2.6 REST API Reference

All endpoints are under `/api`. Unless noted, all require a valid JWT.
List endpoints return a `PageResponse<T>`:

```json
{ "content": [ ... ], "page": 0, "size": 20, "totalElements": 0, "totalPages": 0 }
```

#### Auth (`/api/auth`)

| Method | Path | Auth | Request Body | Response | Status Codes |
|---|---|---|---|---|---|
| POST | `/auth/login` | public | `LoginRequest{email, password}` | `LoginResponse{token, user: UserResponse}` | 200, 400, 401 |
| POST | `/auth/register` | ADMIN | `UserCreateRequest{firstName, lastName, email, password, role}` | `UserResponse` | 201 (+Location), 400, 403, 409 |

#### Users (`/api/users`)

| Method | Path | Auth | Request Body | Response | Status Codes |
|---|---|---|---|---|---|
| GET | `/users` | any | — | `List<UserResponse>` | 200 |
| GET | `/users/me` | any | — | `UserResponse` | 200 |
| PUT | `/users/me` | any | `UserSelfUpdateRequest{firstName, lastName, password?}` | `UserResponse` | 200, 400 |
| GET | `/users/{id}` | any | — | `UserResponse` | 200, 404 |
| PUT | `/users/{id}` | ADMIN | `UserUpdateRequest{firstName, lastName, password?, role, active}` | `UserResponse` | 200, 400, 403, 404 |

`UserResponse{id, firstName, lastName, email, role, active, createdAt}` —
password hash is never included.

#### Companies (`/api/companies`)

| Method | Path | Auth | Response | Status Codes | Caching |
|---|---|---|---|---|---|
| GET | `/companies` | any | `List<CompanyResponse{id, name}>` | 200 | reads through `companies` cache |

#### Contacts (`/api/contacts`)

| Method | Path | Auth | Request Body | Response | Status Codes | Caching |
|---|---|---|---|---|---|---|
| GET | `/contacts?search&tagId&page&size` | any | — | `PageResponse<ContactResponse>` | 200 | — |
| POST | `/contacts` | any | `ContactCreateRequest` | `ContactResponse` | 201 (+Location), 400, 404 | evicts `contacts[id]` |
| GET | `/contacts/{id}` | any | — | `ContactResponse` | 200, 404 | reads through `contacts` cache, key `#id` |
| PUT | `/contacts/{id}` | any | `ContactUpdateRequest` | `ContactResponse` | 200, 400, 404 | evicts `contacts[id]` |
| DELETE | `/contacts/{id}` | any | — | — | 204, 404 | evicts `contacts[id]` |

`ContactCreateRequest`/`ContactUpdateRequest`:
```
firstName*: string (max 100)     lastName*: string (max 100)
email?: string (@Email, max 255) phone?: string (max 50)
title?: string (max 150)         companyId?: long
ownerId*: long                   tagIds?: long[] (default [])
```

`ContactResponse`:
```
id, firstName, lastName, email, phone, title,
companyId, companyName, ownerId, ownerName,
tags: TagResponse[], createdAt, updatedAt
```

#### Tags (`/api/tags`)

| Method | Path | Auth | Request Body | Response | Status Codes | Caching |
|---|---|---|---|---|---|---|
| GET | `/tags` | any | — | `List<TagResponse{id, name, color}>` | 200 | reads through `tags` cache |
| POST | `/tags` | ADMIN | `TagCreateRequest{name* (max 50), color* (^#[0-9A-Fa-f]{6}$)}` | `TagResponse` | 201 (+Location), 400, 403, 409 | evicts all of `tags` |
| DELETE | `/tags/{id}` | ADMIN | — | — | 204, 403, 404 | evicts all of `tags` |

#### Deals (`/api/deals`)

| Method | Path | Auth | Request Body | Response | Status Codes | Caching |
|---|---|---|---|---|---|---|
| GET | `/deals/pipeline` | any | — | `PipelineResponse` | 200 | reads through `pipeline` cache |
| POST | `/deals` | any | `DealCreateRequest` | `DealResponse` | 201 (+Location), 400, 404 | evicts all of `pipeline` |
| PUT | `/deals/{id}` | any | `DealUpdateRequest` | `DealResponse` | 200, 400, 404 | evicts all of `pipeline` |
| PATCH | `/deals/{id}/stage` | any | `DealStageUpdateRequest{stage*}` | `DealResponse` | 200, 400, 404 | evicts all of `pipeline` |
| DELETE | `/deals/{id}` | any | — | — | 204, 404 | evicts all of `pipeline` |

`DealCreateRequest`/`DealUpdateRequest`:
```
title*: string (max 255)       value*: decimal (>= 0, default 0)
stage*: DealStage (default LEAD)  closeDate?: date
contactId?: long                ownerId*: long
```

`PipelineResponse{ stages: PipelineStageResponse[] }`
`PipelineStageResponse{ stage, count, totalValue, deals: DealResponse[] }`
`DealResponse{ id, title, value, stage, closeDate, contactId, contactName, ownerId, ownerName, createdAt, updatedAt }`

#### Activities (`/api/activities`)

| Method | Path | Auth | Request Body | Response | Status Codes |
|---|---|---|---|---|---|
| GET | `/activities?contactId&dealId&page&size` | any | — | `PageResponse<ActivityResponse>` | 200 |
| POST | `/activities` | any | `ActivityCreateRequest` | `ActivityResponse` | 201 (+Location), 400, 404 |
| DELETE | `/activities/{id}` | any | — | — | 204, 404 |

`ActivityCreateRequest{ type*: ActivityType, subject* (max 255), body?, contactId?, dealId? }`
— at least one of `contactId`/`dealId` required (service-layer
`IllegalArgumentException` → 400). `createdBy` is set to the authenticated
user.

`ActivityResponse{ id, type, subject, body, contactId, contactName, dealId, dealTitle, createdById, createdByName, createdAt }`

#### Tasks (`/api/tasks`)

| Method | Path | Auth | Request Body | Response | Status Codes |
|---|---|---|---|---|---|
| GET | `/tasks?assigneeId&completed&page&size` | any | — | `PageResponse<TaskResponse>` | 200 |
| POST | `/tasks` | any | `TaskCreateRequest` | `TaskResponse` | 201 (+Location), 400, 404 |
| PUT | `/tasks/{id}` | any | `TaskUpdateRequest` | `TaskResponse` | 200, 400, 404 |
| PATCH | `/tasks/{id}/toggle` | any | — | `TaskResponse` (completed flipped) | 200, 404 |
| DELETE | `/tasks/{id}` | any | — | — | 204, 404 |

`TaskCreateRequest`/`TaskUpdateRequest`:
```
title*: string (max 255)   description?: text
dueDate?: date             contactId?: long
dealId?: long              assigneeId*: long
```

`TaskResponse{ id, title, description, dueDate, completed, contactId, contactName, dealId, dealTitle, assigneeId, assigneeName, createdAt, updatedAt }`

### 2.7 Caching (Redis)

`RedisConfig` defines a single `RedisCacheManager` with a **global 24-hour
TTL** and `GenericJackson2JsonRedisSerializer` (with `JavaTimeModule` and
default typing so cached DTOs round-trip correctly — see
`crm-service/rules.md` §8.5 for the `Collectors.toList()` vs `Stream.toList()`
pitfall this guards against).

| Cache (`CacheNames`) | Method | Key | Evicted by |
|---|---|---|---|
| `companies` | `CompanyService.getAllCompanies()` | (singleton) | — (read-only; no write endpoints) |
| `tags` | `TagService.getAllTags()` | (singleton) | `createTag()`, `deleteTag()` — `allEntries = true` |
| `contacts` | `ContactService.getContactById(id)` | `#id` | `updateContact()`, `deleteContact()` — keyed eviction |
| `pipeline` | `DealService.getPipeline()` | (singleton) | `createDeal()`, `updateDeal()`, `updateStage()`, `deleteDeal()` — `allEntries = true` |

Cache-first semantics: a miss falls through to the DB; if the DB also has no
result, an empty value is cached/returned rather than throwing (rules.md §8.1).

### 2.8 Error Handling

`GlobalExceptionHandler` (`@RestControllerAdvice`) converts every exception
into:

```json
{
  "timestamp": "2026-06-14T10:00:00.123456Z",
  "status": 404,
  "error": "Not Found",
  "message": "Contact 42 not found",
  "path": "/api/contacts/42"
}
```

| Exception | Status | Message |
|---|---|---|
| `ResourceNotFoundException` | 404 | e.g. `"Contact 42 not found"` |
| `ConflictException` | 409 | e.g. `"A tag named 'VIP' already exists"` |
| `AuthenticationException` | 401 | generic `"Invalid email or password"` (never reveals which) |
| `MethodArgumentNotValidException` | 400 | joined field errors, e.g. `"firstName: must not be blank; email: must be a valid email address"` |
| `HttpMessageNotReadableException` | 400 | `"Malformed request body"` |
| `IllegalArgumentException` | 400 | e.g. `"Activity must be linked to a contact or a deal"` |
| any other `Exception` | 500 | `"An unexpected error occurred"` (full exception logged server-side only) |

A "not found" on a **read** (e.g. `GET /contacts/{id}`) returns `200` with an
empty/absent body rather than a 404 — `ResourceNotFoundException` is reserved
for write/reference paths (rules.md §9).

---

## 3. Frontend (`crm-ui`)

### 3.1 Project Structure

```
crm-ui/src/app/
├── app.config.ts / app.ts / app.html / app.routes.ts
├── core/
│   ├── models/        TS interfaces mirroring backend DTOs
│   ├── services/      one HttpClient-based service per resource
│   ├── guards/        authGuard, adminGuard
│   └── interceptors/  jwtInterceptor, errorInterceptor
├── features/
│   ├── auth/login
│   ├── dashboard
│   ├── contacts/{contact-list,contact-detail,contact-form}
│   ├── deals/deal-board
│   ├── activities/activity-feed
│   ├── tasks/task-list
│   ├── tags/tag-list
│   ├── users/user-list
│   └── profile/profile-page
└── shared/
    ├── layout/main-layout, navbar
    ├── confirm-dialog
    ├── {activity,deal,task,tag,user}-form-dialog
    ├── avatar
    └── tag-chip
```

### 3.2 Routing (`app.routes.ts`)

All routes except `/login` are children of a root route rendering
`MainLayoutComponent` (sidebar + `<router-outlet>`), guarded by `authGuard`.
All feature components are lazy-loaded.

| Path | Component | Extra guard |
|---|---|---|
| `/login` | `LoginComponent` | — (public) |
| `/` | `DashboardComponent` | — |
| `/contacts` | `ContactListComponent` | — |
| `/contacts/new` | `ContactFormComponent` | — |
| `/contacts/:id` | `ContactDetailComponent` | — |
| `/contacts/:id/edit` | `ContactFormComponent` | — |
| `/deals` | `DealBoardComponent` | — |
| `/activities` | `ActivityFeedComponent` | — |
| `/tasks` | `TaskListComponent` | — |
| `/users` | `UserListComponent` | `adminGuard` |
| `/tags` | `TagListComponent` | `adminGuard` |
| `/profile` | `ProfilePageComponent` | — |
| `**` | redirect → `/login` | — |

### 3.3 State Management

No NgRx — state lives in Angular **signals**, primarily on `AuthService` and
within individual feature components.

`AuthService`:
- `token: Signal<string|null>` — JWT, persisted in `localStorage`
- `currentUser: Signal<UserResponse|null>` — persisted in `localStorage`
- `isAuthenticated: Computed<boolean>`
- `isAdmin: Computed<boolean>` (`currentUser().role === 'ADMIN'`)
- `login(LoginRequest): Observable<LoginResponse>` → `POST /api/auth/login`
- `logout()` — clears signals + `localStorage`
- `setCurrentUser(UserResponse)` — used after profile edits

### 3.4 Core Models (`core/models/*.ts`)

TypeScript interfaces mirror the backend DTOs 1:1 (see §2.6 for canonical
field lists): `ActivityResponse`/`ActivityCreateRequest`, `ApiError`,
`LoginRequest`/`LoginResponse`, `CompanyResponse`, `ContactResponse`/
`ContactCreateRequest`/`ContactUpdateRequest`, `DealResponse`/
`DealCreateRequest`/`DealUpdateRequest`/`DealStageUpdateRequest`/
`PipelineResponse`/`PipelineStageResponse`, `PageResponse<T>`, `TagResponse`/
`TagCreateRequest`, `TaskResponse`/`TaskCreateRequest`/`TaskUpdateRequest`,
`UserResponse`/`UserCreateRequest`/`UserUpdateRequest`/
`UserSelfUpdateRequest`. Enum unions: `ActivityType`, `DealStage`, `UserRole`.

`ApiError` mirrors the backend error shape (§2.8):
```ts
interface ApiError { timestamp: string; status: number; error: string; message: string; path: string; }
```

### 3.5 Core Services (`core/services/*.ts`)

Thin `HttpClient` wrappers, one per resource — each method maps 1:1 to a
backend endpoint from §2.6:

| Service | Methods |
|---|---|
| `ActivityService` | `getActivities(params)`, `createActivity(req)`, `deleteActivity(id)` |
| `CompanyService` | `getCompanies()` |
| `ContactService` | `getContacts(params)`, `getContact(id)`, `createContact(req)`, `updateContact(id, req)`, `deleteContact(id)` |
| `DealService` | `getPipeline()`, `createDeal(req)`, `updateDeal(id, req)`, `updateDealStage(id, req)`, `deleteDeal(id)` |
| `TagService` | `getTags()`, `createTag(req)` (ADMIN), `deleteTag(id)` (ADMIN) |
| `TaskService` | `getTasks(params)`, `createTask(req)`, `updateTask(id, req)`, `toggleTask(id)`, `deleteTask(id)` |
| `UserService` | `getUsers()`, `getUser(id)`, `getOwnProfile()`, `updateOwnProfile(req)`, `updateUser(id, req)` (ADMIN), `registerUser(req)` (ADMIN → `/auth/register`) |

`*ListParams` types (`ContactListParams`, `TaskListParams`,
`ActivityListParams`) carry pagination (`page`, `size`), filters
(`search`/`tagId`, `assigneeId`/`completed`, `contactId`/`dealId`), and
optional Spring-style `sort` strings.

### 3.6 Guards & Interceptors

| Name | Type | Behavior |
|---|---|---|
| `authGuard` | `CanActivateFn` | `AuthService.isAuthenticated()` → else redirect `/login`. Applied to all routes except `/login`. |
| `adminGuard` | `CanActivateFn` | `AuthService.isAdmin()` → else redirect `/contacts`. Applied to `/users`, `/tags` (assumes `authGuard` already passed). |
| `jwtInterceptor` | `HttpInterceptorFn` | Attaches `Authorization: Bearer <token>` from `AuthService.token()` if present. |
| `errorInterceptor` | `HttpInterceptorFn` | **401** → `logout()` + redirect `/login` (except the login request itself, so the form can show its own error). **403** → snackbar "You are not authorised to do that." **404** → passed through (components show empty states). **5xx/network** → snackbar "Something went wrong. Please try again." Always re-throws so callers can still react. |

### 3.7 Feature Components

| Component | Route | Summary |
|---|---|---|
| `LoginComponent` | `/login` | Centred card, reactive email/password form, inline error on 401, password visibility toggle. |
| `DashboardComponent` | `/` | 3 metric cards (Open Deals + value, Contacts This Week, My Tasks Due Today), pipeline bar chart (LEAD→CLOSED_WON), "My Tasks" widget (top 5, optimistic complete toggle), Recent Activity feed (10 latest). Assembled client-side from `/deals/pipeline`, `/tasks`, `/contacts`, `/activities` — no dedicated dashboard endpoint. |
| `ContactListComponent` | `/contacts` | Paginated/searchable table (debounced 300ms search resets paging); columns: avatar, name, company, email, phone, tags (max 3 + overflow), owner; row-hover edit/delete. |
| `ContactDetailComponent` | `/contacts/:id` | Two-column: left = avatar, inline-editable name/title, action bar (Edit/Log Activity/Add Task/Delete), info grid, linked deals; right = activity feed. |
| `ContactFormComponent` | `/contacts/new`, `/contacts/:id/edit` | Create/edit form: name, email, phone, title, company autocomplete, owner select (defaults to current user), multi-select tags. |
| `DealBoardComponent` | `/deals` | Kanban board, one column per `DealStage`, header shows count + total value; drag-and-drop calls `PATCH /deals/{id}/stage` optimistically (rollback on error); card click opens edit drawer. |
| `ActivityFeedComponent` | `/activities` | Paginated global feed; client-side type filter, server-side contact filter; colour-coded type icons; "Log Activity" opens drawer with no preselection; delete with confirm. |
| `TaskListComponent` | `/tasks` | Paginated list with filter tabs (All/My Tasks/Overdue/Due Today/Upcoming/Completed — due-date buckets computed client-side, `completed` filter server-side); checkbox optimistic toggle; due-date chip colour-coded. |
| `TagListComponent` (ADMIN) | `/tags` | Simple list: swatch, name, delete (confirms removal from all contacts); "New Tag" opens drawer. |
| `UserListComponent` (ADMIN) | `/users` | Table: avatar, name, email, role badge, active status, joined date; "Invite User" → `POST /auth/register`; edit/activate-deactivate → `PUT /users/{id}`. |
| `ProfilePageComponent` | `/profile` | Current user's profile card; edit name and optional password (with confirmation); updates `AuthService.currentUser` on success. |

### 3.8 Shared Components

| Component | Purpose |
|---|---|
| `MainLayoutComponent` | App shell: hosts `NavbarComponent` + `<router-outlet>` for all authenticated routes. |
| `NavbarComponent` | 240px sidebar: brand, nav links (Dashboard/Contacts/Deals/Activities/Tasks), ADMIN-only section (Users/Tags), current user avatar/name/role + logout. |
| `ConfirmDialogComponent` | Generic confirm modal — `{title, message, confirmLabel?, cancelLabel?}` in, `afterClosed()` → `true`/`false`/`undefined`. |
| `ActivityFormDialogComponent` | "Log Activity" drawer; type selector, subject, notes; pre-fills `contactId`/`dealId` if provided, else shows pickers (≥1 required). |
| `DealFormDialogComponent` | Create/edit deal drawer; title, value, stage, close date, contact + owner pickers; delete in edit mode. |
| `TaskFormDialogComponent` | Create/edit task drawer; title, description, due date, assignee, optional contact/deal; delete in edit mode. |
| `TagFormDialogComponent` | "New Tag" drawer; name + colour (native colour input + hex pattern `^#[0-9A-Fa-f]{6}$`); 409 → "A tag with this name already exists." |
| `UserFormDialogComponent` | Invite/edit user drawer; create mode → `POST /auth/register` (email+password required); edit mode → `PUT /users/{id}` (email read-only, password optional, active toggle); 409 → "A user with this email already exists." |
| `AvatarComponent` | Circular initials avatar; background colour deterministically hashed from full name; sizes 24/32/48/80px. |
| `TagChipComponent` | Coloured pill rendering a `TagResponse`'s name on its `color`. |

### 3.9 App Bootstrap (`app.config.ts`)

```ts
provideBrowserGlobalErrorListeners()
provideZoneChangeDetection({ eventCoalescing: true })
provideRouter(routes, withComponentInputBinding())
provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor]))
provideAnimationsAsync()
```

`app.html` is a single `<router-outlet />`; all chrome comes from
`MainLayoutComponent`/`NavbarComponent` per route.

---

## 4. Deployment (`docker-compose.yml`)

| Service | Image / Build | Container | Host Port → Container Port | Notes |
|---|---|---|---|---|
| `postgres` | `postgres:16` | `crm-postgres` | `5433:5432` | DB `crmdb`, user `crm` |
| `redis` | `redis:7-alpine` | `crm-redis` | `6380:6379` | |
| `pgadmin` | `dpage/pgadmin4` | `crm-pgadmin` | `5050:80` | DB inspection UI |
| `crm-service` | `./crm-service/Dockerfile` (maven:3.9-eclipse-temurin-21, `mvn spring-boot:run`) | `crm-service` | `8093:8093` | depends on postgres, redis; `SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/crmdb`, `SPRING_DATA_REDIS_HOST=redis` |
| `crm-ui` | `./crm-ui/Dockerfile` (node:22-alpine, `ng serve --host 0.0.0.0 --port 4210 --poll 2000`) | `crm-ui` | `4210:4210` | depends on crm-service |

Source directories are bind-mounted into both app containers for live reload;
`crm_service_m2` and `crm_ui_node_modules` named volumes cache dependencies
across rebuilds.

### Default Credentials (local dev only)

- **Admin login:** `admin@crm.local` / `admin123` (seeded by `V8`)
- **JWT secret / DB credentials:** see §2.2 — replace via env vars for any
  non-local environment.

---

## 5. Known Gaps

- `crm-service/src/test/` contains no test classes yet, despite
  `crm-service/rules.md` §13 mandating unit/controller/repository test
  coverage.
- `CompanyService.getAllCompanies()` is cached but has no corresponding
  create/update/delete endpoints or eviction — acceptable only while
  companies are read-only from the API's perspective.
