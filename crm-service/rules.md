# crm-service — Backend Coding Standards

These rules govern all code written under `crm-service`. They exist so that the
codebase is consistent, self-documenting, and reviewable without back-and-forth.
Every PR (including AI-generated changes) must comply before it is considered done.

---

## 1. Project Structure

```
src/main/java/com/crm/
├── CrmApplication.java
├── config/        # SecurityConfig, RedisConfig, CacheConfig, etc.
├── security/       # JwtUtil, JwtAuthenticationFilter, UserDetailsServiceImpl
├── entity/         # JPA entities (one class per table)
├── repository/     # Spring Data JpaRepository interfaces
├── dto/            # Request/response DTOs (never expose entities over REST)
├── service/        # Business logic, transactions, caching
├── controller/     # REST controllers (thin — delegate to services)
└── exception/      # Custom exceptions + GlobalExceptionHandler
```

- One public top-level type per file; file name == type name.
- No wildcard imports.
- Package-by-layer (current structure) is mandatory — do not introduce
  package-by-feature without updating this document first.

---

## 2. Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Class / Interface | PascalCase, noun | `ContactService`, `ContactRepository` |
| Method | camelCase, verb phrase | `getContactById`, `createDeal` |
| Constant | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| Request DTO | `<Entity><Action>Request` | `ContactCreateRequest`, `DealUpdateRequest` |
| Response DTO | `<Entity>Response` | `ContactResponse` |
| Cache name | constant in `CacheNames`, lowercase | `CacheNames.CONTACTS` |
| Test class | `<Class>Test` (unit) / `<Class>IT` (integration) | `ContactServiceTest` |

---

## 3. Entity / Database Documentation (mandatory)

**Every JPA entity class must carry a class-level Javadoc comment** explaining:
- What real-world concept the table represents.
- Its key relationships to other tables.
- Any non-obvious constraints (uniqueness, soft-delete, enum meanings).

Every Flyway migration file must start with a SQL comment block describing the
table(s) it creates/modifies and why.

```java
/**
 * A company (organisation) that one or more {@link Contact}s and {@link Deal}s
 * may belong to. Maps to the "companies" table.
 *
 * Relationships:
 *  - One company has many contacts (Contact.company).
 *
 * Notes:
 *  - "name" is not unique; duplicate company names are allowed.
 */
@Entity
@Table(name = "companies")
public class Company {
    // ...
}
```

```sql
-- V2__create_companies_table.sql
-- Stores organisations that contacts and deals can be linked to.
-- A contact may optionally belong to one company (companies.id -> contacts.company_id).
CREATE TABLE companies (
    ...
);
```

---

## 4. Method Documentation (mandatory)

**Every method — public or private — in `service`, `controller`, `security`,
`config`, and any custom repository query method must have a Javadoc/comment
block** describing:

- What the method does (one sentence summary).
- `@param` for each parameter.
- `@return` describing what is returned, including empty/Optional semantics.
- `@throws` for any checked or documented runtime exception.

Controllers must also document the HTTP contract (route, required role).

```java
/**
 * Returns the contact with the given id.
 *
 * Reads through the {@code contacts} cache (see {@link CacheNames#CONTACTS}).
 * On a cache miss the contact is loaded from the database and cached for
 * {@value CacheConfig#DEFAULT_TTL_HOURS} hours.
 *
 * @param id the contact id
 * @return the contact, or {@link Optional#empty()} if no contact with this
 *         id exists (in cache or in the database)
 */
@Cacheable(cacheNames = CacheNames.CONTACTS, key = "#id")
public Optional<ContactResponse> getContactById(Long id) {
    // ...
}
```

This is non-negotiable even when the implementation looks "obvious" — the
comment is part of the contract a reviewer checks against.

---

## 5. DTOs & API Contracts

- JPA entities are **never** returned from or accepted by a controller.
- Map entity ↔ DTO with a dedicated mapper method (static method on the DTO,
  or a `<Entity>Mapper` component) — keep mapping logic out of controllers.
- Request DTOs validate input (`jakarta.validation`); response DTOs expose
  only fields the client needs.

---

## 6. Validation

- All request DTO fields use `jakarta.validation` annotations
  (`@NotNull`, `@NotBlank`, `@Email`, `@Size`, `@Positive`, etc.).
- Controllers annotate `@Valid` on every `@RequestBody`.
- Cross-field / business-rule validation belongs in the service layer and
  throws a documented domain exception (see §8).

---

## 7. Exception Handling

- Domain exceptions (`ResourceNotFoundException`, `ConflictException`, ...)
  live in `exception/` and extend `RuntimeException`.
- `GlobalExceptionHandler` (`@RestControllerAdvice`) converts every exception
  into a consistent error body:

```json
{
  "timestamp": "2026-06-14T10:00:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Contact 42 not found",
  "path": "/api/contacts/42"
}
```

- Never let a raw stack trace, SQL error, or internal exception message reach
  the client.
- "Not found" on a **read** is not an exception — see §9. `ResourceNotFoundException`
  is reserved for operations that *require* the entity to exist (update/delete
  on a missing id, FK references, etc.).

---

## 8. Caching Strategy (mandatory)

These rules apply to every cacheable read in the service layer.

### 8.1 Cache-first reads
1. Annotate the read method with `@Cacheable`.
2. On a cache **hit**, return the cached value — do not touch the database.
3. On a cache **miss**, query the database.
4. If the database also has no result, **return empty** (`Optional.empty()`,
   an empty list/page, etc.) — **never throw** for a plain "not found" read.

### 8.2 TTL
- **All caches use a 24-hour TTL.** This is configured once, globally, in
  `RedisConfig` (`CacheConfig.DEFAULT_TTL_HOURS = 24`). Do not set per-cache
  TTLs unless a future rule explicitly overrides this document.

### 8.3 Invalidation on write
- Any service method that **creates, updates, or deletes** an entity that
  participates in a cache **must** evict the affected cache entries so the
  next read is not stale:
  - Single-entity caches (e.g. `contacts::{id}`): `@CacheEvict(cacheNames = CacheNames.CONTACTS, key = "#id")` on update/delete.
  - Collection/aggregate caches (e.g. `pipeline`, `tags`): `@CacheEvict(cacheNames = CacheNames.TAGS, allEntries = true)` on create/update/delete.
- When a single write affects both a single-entity cache and a collection
  cache, evict both (`@Caching(evict = { ... })`).

### 8.4 Cache names & keys
- Cache names are declared once as constants in `CacheNames` — no inline
  string literals in `@Cacheable`/`@CacheEvict`.
- Keys are explicit (`key = "#id"`, `key = "#search + '-' + #page"`), never
  the default `SimpleKey` for parameterised lookups.

### 8.5 List-returning cache methods must use `Collectors.toList()`
- `@Cacheable` methods that return `List<T>` **must** build the list with
  `.collect(Collectors.toList())`, not `Stream.toList()`.
- **Why:** `Stream.toList()` returns an immutable `java.util.ImmutableCollections`
  list, a `final` class. `RedisConfig`'s `ObjectMapper` uses
  `DefaultTyping.NON_FINAL`, so on write Jackson omits the root type wrapper
  for this `final` list (it only types the non-final elements). On a
  cache-hit read (`Object.class` target), Jackson requires a
  `WRAPPER_ARRAY`-style type id for any root value that serializes to a JSON
  array, and the missing wrapper causes
  `SerializationException: Could not read JSON: Unexpected token (START_OBJECT),
  expected VALUE_STRING ... type id (for subtype of java.lang.Object)` on the
  second (cache-hit) request. A plain (non-final) `ArrayList` from
  `Collectors.toList()` gets the `WRAPPER_ARRAY` wrapper on write and
  round-trips correctly.

### 8.6 Reference implementation

```java
public final class CacheNames {
    public static final String CONTACTS = "contacts";
    public static final String PIPELINE = "pipeline";
    public static final String TAGS = "tags";
    private CacheNames() {}
}
```

```java
@Configuration
public class RedisConfig {

    /** Global TTL applied to every cache (see rules.md §8.2). */
    public static final long DEFAULT_TTL_HOURS = 24;

    /**
     * Builds the {@link RedisCacheManager} used for all {@code @Cacheable}
     * caches in the application, applying a single 24-hour TTL and a JSON
     * value serializer to every cache.
     *
     * @param connectionFactory the Redis connection factory
     * @return a cache manager with a uniform 24-hour TTL
     */
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(DEFAULT_TTL_HOURS))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer()));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    }
}
```

```java
/**
 * Returns all tags, ordered by name.
 *
 * Reads through the {@code tags} cache for 24 hours (see RedisConfig).
 *
 * @return the list of tags, or an empty list if none exist
 */
@Cacheable(cacheNames = CacheNames.TAGS)
public List<TagResponse> getAllTags() {
    // Collectors.toList() (not Stream.toList()) — see rules.md §8.5.
    return tagRepository.findAllByOrderByNameAsc().stream()
            .map(TagMapper::toResponse)
            .collect(Collectors.toList());
}

/**
 * Creates a new tag and invalidates the {@code tags} cache so the new tag
 * is visible on the next read.
 *
 * @param request the tag to create
 * @return the created tag
 */
@CacheEvict(cacheNames = CacheNames.TAGS, allEntries = true)
public TagResponse createTag(TagCreateRequest request) {
    // ...
}
```

---

## 9. Transaction Management

- `@Transactional` on service methods that perform writes, or reads that span
  multiple repository calls and must be consistent.
- Read-only paths use `@Transactional(readOnly = true)`.
- Transaction boundaries live in the **service** layer only — never in
  controllers or repositories.

---

## 10. Logging

- Use SLF4J via Lombok's `@Slf4j`. `System.out`/`System.err` are forbidden.
- Levels:
  - `ERROR` — failures that need attention (unexpected exceptions).
  - `WARN` — recoverable issues (e.g. fallback path taken).
  - `INFO` — significant business events (user created, deal stage changed).
  - `DEBUG` — diagnostic detail, disabled in production.
- Never log secrets, password hashes, or JWTs.

---

## 11. REST API Conventions

- Follow the endpoint list in `docs/implementation_plan_crm.md` exactly —
  resource-oriented, plural nouns, `/api/...`.
- HTTP status codes:
  - `200` read/update success, `201` created (with `Location` header),
    `204` deleted/no content, `400` validation error, `401` unauthenticated,
    `403` forbidden, `404` not found (write paths only — see §8.1), `409` conflict.
- List endpoints support `page`/`size` query params and return a paged
  response wrapper.

---

## 12. Security

- Passwords hashed with `BCryptPasswordEncoder(12)` — never logged, never
  returned in any DTO.
- JWT signing secret comes from `${JWT_SECRET}` (env var); the value in
  `application.yml` is a local-dev default only and must never be reused
  for a deployed environment.
- Role checks use `@PreAuthorize("hasRole('ADMIN')")` on the controller
  method — not ad-hoc checks inside service code.
- All JPA queries use parameter binding (JPQL/derived queries) — no string
  concatenation into queries.

---

## 13. Testing

- **Service layer**: unit tests (JUnit 5 + Mockito) covering business logic,
  cache-hit/miss/evict behaviour, and empty-result handling.
- **Controller layer**: `@WebMvcTest` + `MockMvc`, covering auth/role
  enforcement and validation error responses.
- **Repository layer**: `@DataJpaTest` for custom query methods.
- Every bug fix includes a regression test.

---

## 14. Code Style & Formatting

- 4-space indentation, max line length 120.
- Braces on the same line (K&R).
- Constructor injection only (`@RequiredArgsConstructor` from Lombok) —
  no `@Autowired` field injection.
- Lombok on entities: `@Getter`/`@Setter` only — avoid `@Data`/`@EqualsAndHashCode`
  on entities (JPA proxy/equality pitfalls). DTOs may use `@Data`/`@Builder`.
- Favor `final` fields and constructor injection for immutability.

---

## 15. Database Migrations (Flyway)

- Naming: `V{n}__snake_case_description.sql`, strictly sequential.
- **Never edit a migration that has already been applied/committed** — add a
  new one instead.
- Every migration starts with a comment block describing its purpose (see §3).

---

## 16. Null Safety

- Repository methods returning a single row return `Optional<T>`.
- Service methods never return `null` — use `Optional`, an empty
  collection/page, or a documented exception (for write paths).

---

## 17. Self-Review Checklist (before considering a change done)

- [ ] Every new/changed entity has a class-level Javadoc + migration comment (§3).
- [ ] Every new/changed method has a Javadoc/comment block (§4).
- [ ] No entity is exposed directly via a controller (§5).
- [ ] Request DTOs validated with `@Valid` + Bean Validation (§6).
- [ ] Errors flow through `GlobalExceptionHandler`, no raw exceptions leak (§7).
- [ ] Cacheable reads: cache-first, empty-on-miss, 24h TTL, eviction wired on
      every write that touches that cache (§8).
- [ ] Transactions on service methods that write or do multi-step reads (§9).
- [ ] No `System.out`, no secrets in logs (§10).
- [ ] Role checks via `@PreAuthorize` where required (§12).
- [ ] Tests added/updated and passing (§13).
