# CRM Application — Implementation Plan

## Context
Greenfield CRM for a small team (2–10 people). Needs multi-user auth, contacts, deals/pipeline, activity log, and tasks. Stack is Spring Boot 3 + Angular 20 + PostgreSQL + Redis + Flyway.

---

## Architecture Decisions

| Concern | Choice | Reason |
|---------|--------|--------|
| Java framework | Spring Boot 3 / Java 21 | Industry standard, strong ecosystem |
| ORM | Spring Data JPA (Hibernate) | Native Spring integration |
| Auth | Spring Security 6 + JWT (stateless) | Stateless fits small-team REST API |
| Cache | Redis via Spring Data Redis (Lettuce) | Best-in-class for Spring Boot; low-latency |
| Migrations | Flyway | Deterministic, version-controlled schema |
| Frontend | Angular 20 (standalone + signals) | Requested by user |
| UI lib | Angular Material 20 | First-party, well-integrated |
| Build | Maven (crm-service) + Angular CLI (crm-ui) | Standard tooling |
| Local dev | Docker Compose: postgres + redis + pgadmin | Consistent local environment |

---

## Project Layout

```
CRM/
├── docker-compose.yml
├── crm-service/                      # Spring Boot 3 Maven project
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/crm/
│       │   ├── CrmApplication.java
│       │   ├── config/               SecurityConfig, RedisConfig
│       │   ├── security/             JwtUtil, JwtAuthenticationFilter, UserDetailsServiceImpl
│       │   ├── entity/               User, Company, Contact, Tag, Deal, Activity, Task
│       │   ├── repository/           one JpaRepository per entity
│       │   ├── dto/                  request+response DTOs per feature
│       │   ├── service/              AuthService, ContactService, DealService,
│       │   │                         ActivityService, TaskService, TagService, UserService
│       │   ├── controller/           REST controllers per feature
│       │   └── exception/            GlobalExceptionHandler, ResourceNotFoundException
│       └── resources/
│           ├── application.yml
│           └── db/migration/         V1–V8 Flyway scripts
└── crm-ui/                            # Angular 20 CLI project
    └── src/app/
        ├── core/                     models, interceptors, guards, services
        ├── features/                 auth, contacts, deals, activities, tasks, users
        └── shared/                   NavbarComponent, ConfirmDialogComponent, TagChipComponent
```

---

## Domain Model (JPA Entities)

| Entity | Key Fields |
|--------|-----------|
| User | id, firstName, lastName, email (unique), passwordHash, role (ADMIN/USER), active |
| Company | id, name, industry, website, phone, address, createdBy, createdAt |
| Tag | id, name, color, createdBy |
| Contact | id, firstName, lastName, email, phone, title, company (FK), tags (M2M), owner (FK→User) |
| Deal | id, title, value, stage (enum), closeDate, contact (FK), owner (FK→User) |
| Activity | id, type (CALL/EMAIL/MEETING/NOTE), subject, body, contact (FK), deal (FK), createdBy |
| Task | id, title, description, dueDate, completed, contact (FK), deal (FK), assignee (FK→User) |

## Flyway Migrations

8 scripts, versioned `V1` through `V8`:
- V1: users table
- V2: companies table
- V3: contacts table + contact_tags join table
- V4: tags table
- V5: deals table
- V6: activities table
- V7: tasks table
- V8: seed admin user (BCrypt hash for `admin123`)

---

## Caching Strategy (Redis)

| Cache Name | Method | Evicted When |
|------------|--------|-------------|
| `tags` | `TagService.getAllTags()` | tag created/deleted |
| `pipeline` | `DealService.getPipeline()` | deal created/updated/deleted |
| `contacts` | `ContactService.getById(id)` | contact updated/deleted |

Spring annotations: `@Cacheable`, `@CacheEvict`.
Redis TTL: 24 hours for all caches (uniform, configured globally in `RedisConfig`).
Reads are cache-first: on a cache miss, fall through to the database; if the
database also has no result, return empty rather than throwing. See
`crm-service/rules.md` §8 for the full caching rules.

---

## Security Design

- `POST /api/auth/login` → returns `{ token, user }` (no auth required)
- `POST /api/auth/register` → ADMIN only
- All other `/api/**` routes require valid JWT in `Authorization: Bearer <token>` header
- `JwtAuthenticationFilter` runs before `UsernamePasswordAuthenticationFilter`
- Roles enforced via `@PreAuthorize("hasRole('ADMIN')")` on admin endpoints
- Passwords hashed with `BCryptPasswordEncoder(12)`

---

## Key REST API Endpoints

```
POST   /api/auth/login
POST   /api/auth/register            [ADMIN]

GET    /api/contacts?search&page&size
POST   /api/contacts
GET    /api/contacts/{id}
PUT    /api/contacts/{id}
DELETE /api/contacts/{id}

GET    /api/deals/pipeline           [cached]
POST   /api/deals
PUT    /api/deals/{id}
PATCH  /api/deals/{id}/stage
DELETE /api/deals/{id}

GET    /api/activities?contactId&dealId
POST   /api/activities
DELETE /api/activities/{id}

GET    /api/tasks?assigneeId&completed
POST   /api/tasks
PUT    /api/tasks/{id}
PATCH  /api/tasks/{id}/toggle
DELETE /api/tasks/{id}

GET    /api/tags
POST   /api/tags                     [ADMIN]
DELETE /api/tags/{id}                [ADMIN]

GET    /api/users                    [ADMIN]
GET    /api/users/{id}
PUT    /api/users/{id}               [ADMIN]
```

---

## Angular Frontend

- **Standalone components** throughout (no NgModules)
- **Signals** for local component state
- **HttpClient** with functional `jwtInterceptor` that attaches Bearer token
- **`authGuard`** (functional) protects all routes except `/login`
- **`adminGuard`** (functional) protects `/users`
- Token stored in `localStorage`; `AuthService` exposes `currentUser` signal

---

## Implementation Order (Groups)

1. **Infrastructure**: `docker-compose.yml`, `pom.xml`, `application.yml`, `CrmApplication.java`
2. **Flyway migrations**: V1–V8 SQL scripts
3. **JPA entities**: User → Company → Tag → Contact → Deal → Activity → Task
4. **Repositories**: one interface per entity
5. **Security layer**: `JwtUtil`, `UserDetailsServiceImpl`, `JwtAuthenticationFilter`, `SecurityConfig`, `RedisConfig`
6. **DTOs**: auth, user, contact, deal, activity, task, tag
7. **Exceptions**: `ResourceNotFoundException`, `ConflictException`, `GlobalExceptionHandler`
8. **Services**: TagService → UserService → AuthService → ContactService → DealService → ActivityService → TaskService
9. **Controllers**: Auth → Tag → User → Contact → Deal → Activity → Task
10. **Frontend bootstrap**: `ng new` + `app.config.ts` + `app.routes.ts`
11. **Frontend core**: models, interceptor, guards, services
12. **Frontend shared**: Navbar, ConfirmDialog, TagChip
13. **Frontend features**: login → contacts → deals → activities → tasks → users

---

## Verification Steps

1. `docker-compose up -d` → confirm postgres + redis healthy
2. `mvn clean package && java -jar target/*.jar` → confirm Flyway applied 8 migrations
3. `POST /api/auth/login` with `admin@crm.local` / `admin123` → get JWT token
4. `POST /api/contacts` with token → create contact
5. `GET /api/tags` twice → second call logged as cache hit
6. `GET /api/deals/pipeline` → verify pipeline structure
7. `ng serve` → navigate to `http://localhost:4200` → login, browse features
8. Navigate to `/users` as USER role → redirected to `/contacts` (adminGuard working)
