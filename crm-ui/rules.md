# crm-ui — Frontend Coding Standards

These rules govern all code written under `crm-ui`. They mirror the spirit of
`crm-service/rules.md`: consistent, self-documenting, reviewable without
back-and-forth. Every change (including AI-generated changes) must comply
before it is considered done.

---

## 1. Project Structure

```
src/app/
├── core/           # models, interceptors, guards, singleton services
├── features/       # one folder per feature: auth, contacts, deals, activities, tasks, users
├── shared/         # reusable presentational components (Navbar, ConfirmDialog, TagChip)
├── app.config.ts
└── app.routes.ts
```

- **Standalone components** throughout — no `NgModule`s.
- Each feature folder is self-contained: components, routes, and a feature
  service live together; cross-feature reuse goes through `core`/`shared`.
- One component/class per file; file name matches the Angular convention
  (`contact-list.component.ts`, `contact.service.ts`, `contact.model.ts`).

---

## 2. Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Component class | PascalCase + `Component` | `ContactListComponent` |
| Component file | kebab-case + `.component.ts` | `contact-list.component.ts` |
| Service | PascalCase + `Service` | `ContactService` |
| Signal | camelCase noun (state), `is`/`has` prefix for booleans | `contacts`, `isLoading` |
| Computed signal | camelCase, describes derived value | `filteredContacts` |
| Guard | camelCase + `Guard` (functional) | `authGuard`, `adminGuard` |
| Interceptor | camelCase + `Interceptor` (functional) | `jwtInterceptor` |
| Model/interface | PascalCase, matches backend DTO name | `ContactResponse`, `DealCreateRequest` |

TypeScript models in `core/models` mirror the backend response/request DTOs
field-for-field (same names, camelCase) so mapping is a pass-through.

---

## 3. Component & Method Documentation (mandatory)

**Every component class and every public method (and any non-trivial private
method) in components, services, guards, and interceptors must have a comment
block** describing:

- What it does (one sentence summary).
- `@param` for each parameter (where not obvious from TS types alone).
- What it returns / emits / mutates (which signals it updates).

```typescript
/**
 * Loads the contact with the given id from the backend and stores it in
 * the `contact` signal. Sets `notFound` to true if the backend returns 404
 * (contact does not exist in cache or database).
 *
 * @param id the contact id from the route
 */
loadContact(id: number): void {
  // ...
}
```

This is non-negotiable even when the implementation looks "obvious" — the
comment is part of the contract a reviewer checks against.

---

## 4. Standalone Components & Signals

- All components are `standalone: true`, with explicit `imports: []`.
- Local UI state uses **signals** (`signal()`, `computed()`, `effect()`),
  not `BehaviorSubject`/manual subscriptions, unless interop with an RxJS
  API (e.g. `HttpClient`) requires it — in that case convert to a signal at
  the boundary with `toSignal()`.
- Templates use the new control-flow syntax (`@if`, `@for`, `@switch`), not
  `*ngIf`/`*ngFor`.
- `@for` loops always specify `track` (entity `id`).

---

## 5. Services & HTTP Layer

- One injectable service per feature (e.g. `ContactService`), responsible for
  all `HttpClient` calls for that feature — components never call
  `HttpClient` directly.
- Service methods return `Observable<T>` from `HttpClient`; components
  convert to signals via `toSignal()` or subscribe and write into a signal,
  always handling the error case (see §9).
- **Caching is owned by the backend** (24h Redis cache, see
  `crm-service/rules.md` §8). The frontend must **not** implement its own
  duplicate caching/staleness layer — always call the service method, and
  let the backend's cache-first behaviour handle repeat reads. The one
  exception is short-lived, in-memory signal state for the currently-loaded
  entity/list (avoiding redundant requests within the same view).

---

## 6. Routing & Guards

- Routes are lazy-loaded per feature (`loadComponent`/`loadChildren`).
- `authGuard` (functional) protects every route except `/login`.
- `adminGuard` (functional) protects `/users` and any other admin-only routes.
- Route params are read via `input()`-bound route params (`withComponentInputBinding`)
  where practical, not `ActivatedRoute.snapshot` scattered through components.

---

## 7. Forms

- Reactive Forms only (`FormGroup`/`FormControl`/`FormBuilder`), no template-driven forms.
- Every form field that maps to a backend-validated DTO field mirrors that
  validation client-side (`Validators.required`, `Validators.email`,
  `Validators.maxLength`, etc.) for immediate feedback — server-side
  validation remains the source of truth.
- Validation error messages are defined once per form (a small `errors`
  signal/map), not duplicated inline across the template.

---

## 8. Styling & Design Tokens

- Angular Material 20 components first; custom styling only for layout and
  the design tokens defined in `docs/DESIGN.md` §3 (colours, typography,
  spacing, radius, shadows).
- Design tokens are defined once as SCSS variables / CSS custom properties
  in a shared stylesheet — components reference tokens, never hard-code
  hex colours or magic spacing numbers.
- 8px base grid (per `docs/DESIGN.md`) for all spacing.
- Honour `prefers-reduced-motion` for any custom animation.

---

## 9. Error Handling & User Feedback

- A global `errorInterceptor` catches HTTP errors:
  - `401` → clear session, redirect to `/login`.
  - `403` → show "not authorised" feedback, stay on page.
  - `404` on a read → treated as empty state in the component (e.g. "Contact
    not found"), **not** a thrown error bubbled to a generic error page.
  - `5xx`/network errors → show a non-blocking snackbar/toast with a generic
    message; never show raw error objects/stack traces to the user.
- Every async action that can fail (save, delete, load) updates a
  component-level `error`/`loading` signal so the template can render the
  right state.

---

## 10. Accessibility (a11y)

- All interactive elements are real buttons/links or have appropriate
  `role`/`aria-*` attributes.
- Forms: every input has an associated `<label>` (via Material form field or
  explicit `for`/`id`).
- Color is never the only signal for state (e.g. deal stage, task overdue) —
  pair with an icon or text label.
- Modals/drawers trap focus and restore focus to the trigger element on close.

---

## 11. Testing

- **Component tests** (Jasmine/Karma via Angular CLI): render + interaction
  tests for components with non-trivial logic (forms, computed signals,
  conditional rendering).
- **Service tests**: `HttpClientTestingModule`/`provideHttpClientTesting()`
  to verify request URLs, methods, payloads, and error handling.
- **Guard/interceptor tests**: cover both allow and deny/redirect paths.
- Every bug fix includes a regression test.

---

## 12. Code Style & Linting

- Strict TypeScript (`strict: true`); `any` is forbidden — use proper types,
  `unknown` + narrowing, or generics.
- ESLint + Prettier enforced; no disabling rules inline without a comment
  explaining why.
- 2-space indentation (Angular/TS convention), single quotes, trailing commas.
- No commented-out code committed.

---

## 13. Performance

- Routes are lazy-loaded (see §6).
- Prefer signals/`computed()` over manual change-detection triggers; avoid
  `ChangeDetectorRef.detectChanges()` calls.
- `@for` always uses `track` to avoid full re-renders (see §4).
- Avoid re-fetching data already held in a signal for the current view.

---

## 14. Self-Review Checklist (before considering a change done)

- [ ] Every new/changed component and method has a comment block (§3).
- [ ] Component is `standalone: true` with explicit imports (§1, §4).
- [ ] State uses signals; templates use `@if`/`@for`/`@switch` with `track` (§4).
- [ ] No direct `HttpClient` usage in components — goes through a feature
      service (§5); no client-side cache duplicating backend caching.
- [ ] Routes lazy-loaded and guarded appropriately (§6).
- [ ] Reactive forms with client-side validation matching backend DTOs (§7).
- [ ] Styling uses Material + design tokens, no hard-coded colours/spacing (§8).
- [ ] Loading/error/empty states handled via signals, errors shown via
      interceptor + snackbar, no raw errors to the user (§9).
- [ ] Accessibility: labels, roles, focus management checked (§10).
- [ ] Tests added/updated and passing (§11).
- [ ] No `any`, lint passes clean (§12).
