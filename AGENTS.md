# Hono Laravel Architecture and Agent SOP v2

This file is the source of truth for human contributors, Codex, and other coding agents working in this repository.

## Language

- Use English or Bahasa Melayu Malaysia only.
- Never use Bahasa Indonesia.

## Mission

Build a Cloudflare-native Hono application with the predictable request flow of Laravel, without recreating Laravel internals or hiding Hono, TypeScript, Drizzle, D1, and Workers behind unnecessary abstractions.

The mandatory flow for every persistent feature is:

```text
Route
  -> Request Schema / Middleware
  -> Controller
  -> Service
  -> Repository
  -> Drizzle ORM
  -> Cloudflare D1
```

Response data flows back through an explicit safe resource or DTO. Raw database rows must not be returned directly by controllers.

The reference implementation is not hypothetical:

```text
auth.ts -> AuthController -> AuthService -> AuthRepository/UserService -> Drizzle -> D1
users.ts -> UserController -> UserService -> UserRepository -> Drizzle -> D1
```

New code must extend this flow instead of bypassing it.

## Instruction Priority

When instructions conflict, follow this order:

1. The user's explicit request and approved scope.
2. This `AGENTS.md` file.
3. The established pattern in the closest existing module.
4. Framework and library documentation.

Do not silently reinterpret the user's scope. For a foundational architecture or folder-structure change, explain the proposed change and obtain approval before implementing it.

## Before Editing

1. Read this file completely.
2. Inspect `git status --short --branch` and preserve unrelated user changes.
3. Inspect the route, request, controller, service, repository, schema, and tests of the closest similar feature.
4. State the intended request flow and files that need to change.
5. Prefer the smallest coherent change. Do not refactor unrelated code.
6. Verify current package/framework behaviour from official documentation when it may have changed.

## Canonical Project Structure

```text
src/
|-- app/
|   |-- Controllers/       # HTTP transport only
|   |-- DurableObjects/    # Cloudflare Durable Objects (fetch-based)
|   |-- Exceptions/        # typed application errors and global mapping
|   |-- Middleware/        # cross-cutting request concerns
|   |-- Models/            # domain, row, and safe resource types
|   |-- Repositories/      # all persistent data access
|   |-- Requests/          # Zod input schemas and validator middleware
|   |-- Services/          # business rules and application workflows
|   |-- Env.ts             # Bindings, Variables, and AppEnv only
|   `-- app.ts             # application bootstrap
|-- config/                # non-secret application configuration
|-- database/
|   |-- migrations/        # committed D1 migrations
|   |-- schema/            # Drizzle schema source of truth
|   `-- seeders/           # local/demo seed data
|-- helpers/               # small framework-independent helpers
|-- routes/                # modular endpoint definitions
`-- index.ts               # Cloudflare Worker entrypoint
tests/
|-- unit/ or focused service tests
|-- repository/D1 integration tests
`-- Worker-level HTTP tests
```

Do not add folders such as `Actions`, `UseCases`, `DTOs`, `Policies`, or `Transformers` merely to imitate another framework. Add a new layer only when an actual feature needs a distinct responsibility that the current layers cannot hold cleanly.

## Layer Contracts

### Routes: endpoint mapping only

All routes live under `src/routes` and are grouped by resource or bounded feature. The main API router mounts modules with `api.route()`.

Routes may:

- Declare the HTTP method and path.
- Attach validation, authentication, authorization, and rate-limit middleware.
- Map the request to a controller handler.

Routes must not:

- Query D1 or import Drizzle schema.
- Instantiate repositories or services directly.
- Contain business rules or response shaping.
- Grow large inline handlers. A trivial health or service-info endpoint is the only normal exception.

Public routes must be deliberately identifiable. New data-management routes are authenticated and deny access by default unless the requirement explicitly makes them public.

### Requests: validate every external input

All body, path parameter, and query-string validation uses dedicated Zod schemas in `src/app/Requests`.

Use the shared `RequestValidator.ts` wrapper so every HTTP validation failure returns the same `422` JSON contract. Do not call raw `zValidator()` in feature request files unless a different protocol contract is explicitly required.

- Validate and normalize before the controller runs.
- Use `z.coerce` only where HTTP input is genuinely string-encoded.
- Put cross-field rules such as password confirmation in the schema.
- Derive input types with `z.infer` instead of rewriting the same shape manually.
- Return the standard validation error contract: `{ message, errors: { field: string[] } }` with status `422`.
- Database-backed rules such as uniqueness belong in the service and must also be enforced by database constraints when possible.

Never duplicate request validation in routes, controllers, and services. A service may still enforce business invariants because services can be called outside HTTP.

### Controllers: thin HTTP boundary

Controllers may:

- Read already validated input and authenticated request variables.
- Resolve a service through `AppServiceProvider`.
- Call one application workflow.
- Select the HTTP status and return the standard response contract.

Controllers must not:

- Import Drizzle, schema tables, or D1 bindings.
- Hash passwords, sign tokens, perform calculations, or enforce domain workflows.
- Catch broad errors that belong in the global exception handler.
- Return raw repository or database rows.

If a handler cannot be understood quickly, move its decisions into a service rather than splitting the controller into more inline callbacks.

### Services: business rules and workflows

Services own use-case decisions and coordinate repositories.

- A service must not depend on Hono `Context`, `Request`, or `Response`.
- Pass plain typed values into services and return plain typed values.
- Coordinate multi-repository and multi-write workflows here.
- A multi-write business operation must be atomic. Use a repository method or D1/Drizzle batch/transaction mechanism appropriate to the runtime; never leave a half-completed workflow.
- Map database rows to explicit safe application resources before returning data to controllers.
- Keep cryptography and token behaviour behind focused service methods or dedicated collaborators once they form a distinct lifecycle.

Do not create interfaces for every class by default. Introduce an interface only for a real boundary, multiple implementations, or a meaningful test seam.

### Repositories: the persistence boundary

All application data access belongs in repositories under `src/app/Repositories`.

- Repositories encapsulate Drizzle queries, filtering, ordering, pagination, writes, and atomic persistence operations.
- A repository may coordinate multiple related tables when the database operation is one atomic bounded workflow, as `AuthRepository.updatePasswordAndRevokeSessions()` does.
- Repositories return typed rows or explicit persistence results, never HTTP responses.
- Use Drizzle's inferred row/insert types as the source of truth; avoid duplicate handwritten row types and blind `as` casts.
- A method that may not find a row returns `undefined`/`null`; a write that must return a row must handle the no-row case explicitly.
- Enforce tenant, owner, school, or account scope in every relevant query. Never fetch broadly and filter in memory.
- Prevent N+1 queries and unbounded `all()` reads. Collection endpoints use deterministic ordering and pagination.

Controllers may never access the database. Services may never issue Drizzle queries directly. This consistent rule is mandatory for persistent modules, even when the first query looks simple.

### Models and resources: explicit safe types

- Prefer `typeof table.$inferSelect` and `typeof table.$inferInsert` for database row types.
- API resources expose only intended fields and never include password hashes, token hashes, internal flags, or secrets.
- Use camelCase in TypeScript and JSON; use snake_case in SQL columns.
- Serialize dates consistently as ISO 8601 strings at the API boundary.
- Avoid mirroring the same shape in schema types, model types, service inputs, and request types unless the shapes have genuinely different responsibilities.

### Middleware: cross-cutting concerns only

Middleware is for authentication, coarse authorization, request IDs, CORS, logging, and similar request-wide concerns.

- Middleware may attach a verified identity to `AppEnv['Variables']`.
- Authentication proves identity; authorization separately decides whether that identity may perform the action.
- Do not trust mutable profile data embedded in a long-lived JWT as the current database truth.
- Ownership and tenant checks must also be enforced at the service/repository query boundary when data scope matters.
- Middleware must either return a response or call `await next()` exactly once.

### Service provider: per-request dependency wiring

`src/app/Services/AppServiceProvider.ts` is the composition root for typed factories, Drizzle construction, repositories, and services.

- Resolve dependencies from `c.env` per request.
- Do not create module-global D1, repository, service, or environment singletons.
- Add a focused factory such as `userServiceFrom(env)` for each service used by controllers.
- Dependency construction belongs here, not in routes or controllers.
- Declare required secret names under `wrangler.jsonc` `secrets.required`; all binding and secret types must come from generated `worker-configuration.d.ts`, never handwritten `Env` fields.

## API Contract

Use one consistent JSON contract:

```json
{ "data": {} }
```

```json
{ "data": [], "meta": { "page": 1, "perPage": 20, "total": 0 } }
```

```json
{ "message": "Human-readable message.", "errors": { "field": ["Reason."] } }
```

- Use `200` for successful reads/updates, `201` for creation, and `204` only when returning no body.
- Use `400` for malformed protocol input, `401` for unauthenticated, `403` for unauthorized, `404` for missing scoped resources, `409` for state conflicts, and `422` for validation.
- Do not leak stack traces, SQL, secret values, or internal exception details.
- Once an API version is published, mount breaking changes under a new version. Do not mix versioned and unversioned routes accidentally.

## Authentication and Authorization

- Login, registration, token issuance, logout, and password-session lifecycle belong to `AuthController` and `AuthService`; general user reads/profile operations belong to `UserController` and `UserService`.
- Password hashing and verification use Workers Web Crypto with a random salt and timing-safe comparison.
- `JWT_SECRET` and provider credentials are runtime secrets; they never live in source, config defaults, tests committed with real values, or logs.
- JWT payloads contain only stable identity/session claims: `sub`, `jti`, and `exp`. Do not embed mutable profile or authorization data.
- Every authenticated request verifies the signature, checks an active non-expired `auth_sessions` row, and reloads the current user from D1.
- Logout revokes the current persisted session. Password changes update the password and revoke every active session atomically.
- Registration always creates the safe `user` role. User collection, creation, and ID-based lookup routes are `admin` only; self-service routes require authentication.
- Rate-limit credential and token issuance endpoints when the application is exposed publicly.
- Authorization is deny-by-default. Listing, viewing, editing, and deleting resources require explicit role/ownership/tenant rules.

## Durable Object Pattern

When implementing Durable Objects, follow this structure:

```text
src/app/DurableObjects/
  |-- RateLimiter.ts           # DO class (implements `fetch`)
  |-- __init__.ts              # Module marker

src/app/Repositories/
  |-- RateLimitRepository.ts   # Wrapper around DO calls
```

**DO Implementation Rules:**

1. **Place DO classes in `src/app/DurableObjects/`** — not in routes, services, or controllers.
2. **Implement `fetch(request)` method** — all request handling happens through HTTP within the DO.
3. **Use `state.storage` for persistence** — key-value storage accessible via `await state.storage.get/set/delete/list`.
4. **Export default class** — Cloudflare Workers expects default export for DO bindings.
5. **Create a Repository wrapper** — wrap DO fetch calls in `src/app/Repositories/` following the same pattern as other repositories.
6. **Add factory helper in AppServiceProvider** — `doNameRepoFromEnv(env)` for per-request resolution.
7. **Comment binding in wrangler.jsonc** — keep template examples commented until activation:
   ```json
   // "durable_objects": {
   //   "bindings": [
   //     { "name": "RATE_LIMITER", "class_name": "RateLimiter" }
   //   ]
   // },
   ```

**After enabling binding:**
- Run `npm run typegen` to regenerate `worker-configuration.d.ts`
- Update repository to use actual binding instead of placeholder
- Add integration tests for the DO behavior

## Database and Migration Discipline

1. `src/database/schema` is the schema source of truth.
2. Generate a migration after a schema change and inspect the generated SQL.
3. Commit schema and migration changes together.
4. Add foreign keys, unique constraints, indexes, nullability, and delete behaviour intentionally.
5. Apply and test migrations locally first.
6. Use `db:push` only for disposable local prototyping, never shared environments.
7. Run remote migrations, remote seeds, deployment, or destructive data operations only when the user explicitly requests them.
8. Seed data must be repeatable with deterministic upsert/conflict behaviour and must never contain production credentials.

For a destructive migration, explain data loss and rollback/recovery implications before execution.

## Error Handling and Observability

- Application failures use typed exceptions and are converted to JSON by the global handler.
- Zod validation, business validation, authentication, authorization, not-found, conflict, and unknown errors must preserve the API contract.
- Translate expected database constraint failures into safe domain/application errors; do not expose raw D1 messages.
- Include the request ID in logs and response headers.
- Use structured JSON logs containing request ID, method, path, status, and duration. Never log passwords, authorization headers, full tokens, reset tokens, or secrets.
- Health checks must not expose configuration or sensitive dependency details.

## Testing Standard

Every feature or fix must be verified at the lowest useful layers:

1. Service unit tests for business rules and failure paths.
2. Repository or Worker/D1 integration tests for real query and constraint behaviour.
3. Worker-level HTTP tests for middleware, validation, status codes, and response shape.
4. A regression test for every fixed bug when practical.

Tests must cover authorization boundaries, not only happy paths. Do not mock D1 when the behaviour being tested depends on SQL, constraints, timestamps, transactions, or Drizzle mapping.

Before completion, run the checks relevant to the change. The normal full verification is:

```powershell
npm run typecheck
npm test
npm audit --omit=dev --audit-level=high
npx wrangler deploy --dry-run
git diff --check
```

After changing `wrangler.jsonc` bindings or vars, also run:

```powershell
npm run typegen
```

Use `npm ci` in CI when a committed lockfile exists.

## Feature Implementation Order

For a normal persistent resource, work in this order:

1. Confirm requirements, access rules, ownership/tenant scope, and API contract.
2. Update Drizzle schema and generate the migration.
3. Define inferred row types and safe resource/input types.
4. Implement repository queries, pagination, and atomic writes.
5. Implement service rules and workflows.
6. Add request schemas and standardized validation.
7. Add thin controller handlers.
8. Register routes and middleware.
9. Add unit, D1 integration, and HTTP tests as appropriate.
10. Update README or architecture documentation when public behaviour changes.

Not every feature needs every new file. Reuse an existing focused module when that keeps responsibilities clear.

## Naming and Style

- TypeScript files containing classes or exported controller/service objects use PascalCase: `UserController.ts`, `UserService.ts`.
- Route files use lowercase resource names: `users.ts`, `auth.ts`.
- Classes and types use PascalCase; functions and variables use camelCase; constants use descriptive camelCase or UPPER_SNAKE_CASE for true constants.
- Database tables and columns use plural snake_case names.
- Route paths use plural kebab-case resources.
- Use strict TypeScript. Do not introduce `any`, `@ts-ignore`, non-null assertions, or broad casts to silence type errors without a documented reason.
- Prefer focused modules and clear names over comments that explain confusing code.

## Agent Safety Rules

- Never expose or commit secrets. Do not print `.dev.vars`, `.env`, tokens, or credentials.
- Never use destructive Git commands or overwrite unrelated user changes.
- Never delete data, migrations, remote resources, or files outside the exact approved scope.
- Do not deploy, push, create a PR, or modify remote D1 state unless explicitly requested.
- Do not claim a check passed unless it was executed in the current worktree.
- If current code conflicts with this architecture, report the conflict and migrate it deliberately; do not copy the violation into new code.

## Definition of Done

A task is complete only when:

- The requested behaviour works through the full request flow.
- Layer boundaries and access rules are preserved.
- Validation and error responses follow the API contract.
- Schema changes include reviewed migrations.
- Relevant tests cover success and failure paths.
- Typecheck and relevant verification pass.
- No secret, debug output, generated junk, or unrelated change was added.
- The final report lists changed files, verification performed, and any remaining risk or intentionally deferred work.
