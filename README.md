# Hono Laravel

Laravel-inspired backend starter built with Hono, TypeScript, Drizzle ORM, Cloudflare D1, and Cloudflare Workers.

It keeps Laravel's predictable request flow without trying to recreate Laravel internally:

```text
Route → Request Schema → Controller → Service → Repository → Drizzle → D1
```

## Features

- Hono Worker entrypoint
- Laravel-inspired `routes`, `Controllers`, `Services`, `Repositories`, `Requests`, `Middleware`, and `Exceptions`
- TypeScript types generated from Wrangler configuration
- Drizzle schema and committed D1 migrations
- PBKDF2 password hashing through Workers Web Crypto
- JWT authentication using a Cloudflare secret
- Zod request validation
- Configurable CORS origin
- Workers Logs and Traces configuration
- Unit tests and Worker-compatible test foundation

## Project structure

```text
frontend/
├── index.html             # Vite client application entrypoint
├── src/styles.css         # Frontend styles with HMR
└── public/                # PWA manifest, service worker, and favicon
src/
├── app/
│   ├── Controllers/      # HTTP handlers; keep them thin
│   ├── Exceptions/       # HTTP exceptions and global error handling
│   ├── Middleware/       # auth, request ID, and cross-cutting concerns
│   ├── Models/           # application types and resources
│   ├── Repositories/     # Drizzle/D1 queries
│   ├── Requests/         # Zod validation schemas
│   ├── Services/         # business logic
│   ├── Env.ts            # Hono environment types (Bindings & Variables)
│   └── app.ts            # application bootstrap
├── config/               # application configuration
├── database/
│   ├── migrations/       # committed SQL migrations
│   ├── schema/           # Drizzle schema source of truth
│   └── seeders/           # local/demo seed data
├── helpers/              # response helpers
├── routes/               # modular Worker API endpoints (auth, users, and resources)
└── index.ts              # Worker entrypoint
tests/
AGENTS.md                # architecture rules for contributors and coding agents
wrangler.jsonc           # Worker and D1 configuration
worker-configuration.d.ts # generated binding types
```

## Local development

Requirements: Node.js 20.19+ or 22.12+, npm, and Wrangler authentication only for remote operations.

```bash
npm ci
copy .env.example .dev.vars       # PowerShell
npm run typegen
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run dev` builds the frontend once, then starts both development servers:

- Frontend with Vite HMR: `http://localhost:5173`
- Hono API Worker: `http://127.0.0.1:8787`

Vite proxies `/api` and `/health` to the Worker. CSS changes apply without reloading; HTML/JavaScript changes trigger an automatic browser reload, so manual refresh is not needed. `npm run deploy` builds the frontend before deploying the Worker and its static assets.

The student dashboard shows up to five published, unfinished assignments scheduled for today (Malaysia time). If there are more, students can open the activity page to see the full list. The authenticated student-only `GET /api/student/today-reminders` endpoint returns the date, reminders and a `hasMore` flag.

## Pembantu AI guru

Pembantu AI hanya tersedia kepada akaun guru. Sekolah ditentukan daripada profil guru yang sedang log masuk dan setiap tool mengehadkan akses kepada sekolah tersebut. Chatbot boleh membantu urusan kelas, murid, latihan, penyerahan, log harian, SEGAK dan laporan. Tindakan yang mengubah data memerlukan pengesahan; arkib atau pengguguran keahlian mengekalkan rekod lama. Kata laluan sementara untuk akaun murid dipaparkan sekali sahaja selepas pengesahan.

Guru boleh memindahkan murid antara kelas aktif dalam sekolah yang sama dan mengemas kini profil sendiri melalui chat. Untuk import pukal, pilih fail CSV dengan lajur `studentIdNum,fullName,gender,dob`, satu murid setiap baris, `gender` bernilai `L` atau `P`, dan `dob` dalam format `YYYY-MM-DD`. Setiap import menerima maksimum 10 murid dan 3,500 bait. Semak setiap baris dalam pratonton sebelum mengesahkan; kandungan CSV dihantar kepada DeepSeek untuk diproses.

DeepSeek dipanggil daripada Worker melalui `https://api.deepseek.com/chat/completions`. Tambahkan secret berikut ke `.dev.vars` untuk pembangunan setempat; jangan masukkan nilai sebenar ke Git:

```dotenv
JWT_SECRET=<random-secret-at-least-32-bytes>
DEEPSEEK_API_KEY=<deepseek-api-key>
```

`DEEPSEEK_MODEL` ditetapkan melalui `wrangler.jsonc` dan boleh ditukar kepada model yang tersedia pada akaun DeepSeek. Perbualan disimpan dalam D1 sehingga guru memadamnya atau ia melepasi 90 hari. Kandungan mesej dan hasil tool dihantar ke DeepSeek; nama, keputusan SEGAK dan ukuran boleh dihantar apabila digunakan oleh tool. Tool tidak mendedahkan nota perubatan atau butiran penjaga. Kata laluan sementara dipaparkan sekali dan tidak disimpan dalam sejarah chat atau dihantar kepada DeepSeek.

## D1 setup and deployment

Create the remote database and follow the printed instructions:

```powershell
npm run setup:d1 -- -DatabaseName hono-laravel
```

Then configure the secret and deploy:

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put DEEPSEEK_API_KEY
npm run typegen
npm run db:migrate:remote
npm run deploy
```

`database_id` is intentionally a placeholder in `wrangler.jsonc`. A GitHub template cannot create a user's Cloudflare resources during clone, so the one-time D1 creation and secret setup remain required.

For remote demo data only:

```bash
npm run db:seed:remote
```

Do not use the demo seed password in a real deployment.

## Database workflow

Edit `src/database/schema/index.ts`, then generate and apply a migration:

```bash
npm run db:generate
npm run db:migrate
```

Use `npm run db:push` only for local prototyping. Commit generated migration files for all shared environments.

## Authentication demo

The sample API includes:

```text
POST /api/auth/login
GET  /api/users/me
```

Login expects an email and password. Passwords are stored using PBKDF2 with a random per-user salt. JWT signing requires `JWT_SECRET` from `.dev.vars` locally or `wrangler secret put JWT_SECRET` remotely.

The seeded local users use:

```text
alice@example.com / password123
bob@example.com   / password123
```

Replace or remove this demo module when starting a real project.

## Tests and checks

```bash
npm run typecheck
npm test
npm audit --omit=dev --audit-level=high
npx wrangler deploy --dry-run
```

## Adding a resource

Follow the existing module pattern:

1. Add the Drizzle table to `src/database/schema`.
2. Generate and commit a migration.
3. Add row/resource types in `src/app/Models`.
4. Add database queries in a Repository.
5. Add business rules in a Service.
6. Add Zod schemas in `src/app/Requests`.
7. Add thin Controller handlers.
8. Register endpoints in `src/routes`.
9. Add unit and Worker-level tests.

See [AGENTS.md](./AGENTS.md) for the mandatory architecture guidelines.

## License

MIT
