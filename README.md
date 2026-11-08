# William Van Loey — Portfolio & CMS

A five-language portfolio with its own content management system. The public site, a REST API and a private dashboard, built as one product:

- **Public site** in English, French, Dutch, Portuguese (Brazil) and Spanish, light and dark themes, pre-rendered and refreshed seconds after each publish.
- **Dashboard (CMS)** to manage projects, profile, experience, education, skills, links, certificates, images and translations, with a draft → preview → publish workflow and a contact inbox.
- **API** in NestJS with Clean Architecture, PostgreSQL through Prisma, an OpenAPI document and Swagger UI.

```
packages/contracts   Zod schemas + route registry shared by API, OpenAPI and dashboard forms
apps/api             NestJS · Prisma · PostgreSQL · Argon2id sessions · Swagger
apps/web             Next.js 15 (App Router) · React 19 · next-intl · Tailwind CSS 4 · React Hook Form
.github/workflows    CI (lint, types, unit, integration, e2e, Docker) and deploys to Vercel
```

---

## Architecture

```
 Visitor ──▶ Next.js on Vercel ─────────── static pages (ISR), tag-revalidated on publish
               │   ▲                           ▲
   dashboard   │   │ signed POST /api/revalidate│
   (BFF proxy) ▼   │                           │
          NestJS REST API on Vercel ──▶ PostgreSQL (Neon: prod + preview branches)
                     ├────────────────▶ Object storage (Vercel Blob or Cloudinary)
                     └────────────────▶ Email (Resend; Mailpit or console locally)
```

### API layers (`apps/api/src`)

| Layer | Contents | Depends on |
| --- | --- | --- |
| `domain/` | Content records, publication rules, errors, **ports** (abstract classes) | `@portfolio/contracts` types only |
| `application/` | Services: publishing, projects, profile, media, contact, auth, site read model, dashboard | domain |
| `infrastructure/` | Prisma repositories, PostgreSQL rate limiter, storage and mail adapters, Argon2, Zod env | domain |
| `presentation/` | Controllers, Zod validation pipe, session guard, exception filter, presenters | application |
| `modules/` | Composition root: the only place that binds ports to adapters | everything |

Swapping Prisma, the image host or the email provider means writing one adapter. No application code changes.

### Key decisions

| # | Decision | Why |
| --- | --- | --- |
| 1 | **One contract package.** Zod schemas for every request and response, plus a route registry. | The API validates with them, the OpenAPI document is generated from them, and the dashboard forms use them through `zodResolver`. A validation rule exists once. |
| 2 | **Draft + published snapshot per item.** Columns hold the editable draft; a `published` JSON column holds what visitors see. | Edits to live content stay private until published, and there is no revision table. The status (`draft` / `published` / `changed`) is computed by comparing the two. Layout switches (order, featured, homepage) apply immediately. |
| 3 | **Static pages, revalidated on publish.** Public pages are tagged `content`; the API calls the site's `/api/revalidate` with an HMAC-signed, timestamped body. | Fast pages and no redeploys. The 1-hour ISR window is only a safety net. |
| 4 | **Opaque server-side sessions** instead of JWTs. Only a SHA-256 of the token is stored. | Logout and password changes revoke access immediately. |
| 5 | **Backend-for-frontend.** The browser talks to `/api/admin/*` on the site, which forwards with the token from an httpOnly, `SameSite=Strict` cookie. | No token in browser JavaScript and no third-party cookies. Mutations also require a same-origin `Origin` header. |
| 6 | **Rate limits in PostgreSQL** (atomic fixed-window upsert). | On serverless every instance has its own memory; limits for login and the contact form must be shared. |
| 7 | **Images resized in the browser**, validated by magic bytes on the API, stored in object storage; metadata in `MediaAsset`. | Keeps uploads under Vercel's 4.5 MB request limit, and SVG (scriptable) and renamed files are rejected. |
| 8 | **Translations as rows** (`*Translation` tables keyed by entity + locale). English required, others optional with fallback. | Visitors always see something. Fallback text carries `lang="en"`, and the dashboard shows a coverage matrix. |

### Security checklist

- Every `/admin` endpoint is authorised by the API (`SessionGuard`); the site's middleware only redirects for convenience.
- Argon2id (19 MiB, t=2), constant work for unknown emails, generic login errors, 5 attempts/min per IP and 10 per 15 min per account.
- Contact form: server-side Zod validation, honeypot field, minimum fill time, 3 messages / 10 min per IP (IP stored only as a salted hash), header-injection-safe email, HTML-escaped templates.
- Uploads: type from magic bytes (JPEG, PNG, WebP, AVIF, GIF; no SVG), size limit, random keys, path-traversal guard for local storage, images in use cannot be deleted.
- Markdown rendered without raw HTML; links limited to http(s)/mailto.
- Helmet on the API (`default-src 'none'` CSP), strict CORS (only the site may call it from a browser), 256 kB JSON limit, no `X-Powered-By`.
- Site: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, strict referrer and permissions policies; dashboard and previews are `noindex`.
- Environment validated with Zod at boot; the API refuses to start in production with example secrets, the console mail driver or no revalidation URL.
- Errors share one shape `{ statusCode, error, message, errors? }`; unexpected errors return a generic 500 and are logged server-side.

---

## Running locally

Requirements: **Node 22+**. Docker is optional.

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

**Database: pick one.**

```bash
# A) Docker: PostgreSQL 16 + Mailpit (fake inbox at http://localhost:8025)
npm run db:up
# apps/api/.env: keep the default DATABASE_URL; MAIL_DRIVER=smtp to see emails in Mailpit

# B) No Docker: PGlite, real PostgreSQL compiled to WebAssembly, data in ./.pglite
npm run db:lite
# apps/api/.env: DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable
#                DIRECT_URL=<same>   DATABASE_POOL_MAX=1
```

Then:

```bash
npm run build:contracts                   # shared schemas (re-run, or `npm run dev:contracts`, after editing them)
npm run db:migrate                        # apply migrations
npm run db:seed                           # verified public profile data + this project as a first case study
npm run admin:create -- --email you@example.com --name "Your Name"   # asks for a password (12+ chars)

npm run dev:api                           # http://localhost:3333/api/v1   · docs: /api/v1/docs
npm run dev:web                           # http://localhost:3000          · dashboard: /dashboard
```

**Everything in containers:**

```bash
MAIL_TO=you@example.com docker compose --profile app up --build
docker compose exec api node dist/cli/create-admin.js --email you@example.com --name "You"
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint (TypeScript, React hooks, Next.js rules) |
| `npm run typecheck` | Type-checks contracts, API and web |
| `npm test` | Unit tests: contracts, API services (in-memory fakes), web components (Vitest + Testing Library) |
| `npm run test:integration` | API over HTTP (Supertest) against a real PostgreSQL: PGlite locally, a service container in CI |
| `npm run test:e2e` | Playwright against a running API + site (start both first) |
| `npm run build` | Production builds of all three packages |

---

## Testing

| Level | Tool | Covers |
| --- | --- | --- |
| Contracts | Jest | Translation pruning, English requirement, date ranges, URL schemes, OpenAPI generation |
| Unit | Jest | Draft/publish rules and URL conflicts, sessions (hashing, expiry, revocation, rate limits), contact spam checks and delivery failure, image validation and replacement, localisation fallback |
| Integration | Jest + Supertest + PostgreSQL | Authorisation on every admin route, project lifecycle, translated responses, validation errors, image upload/replace/in-use protection, profile publishing, coverage report, CORS, security headers, contact rate limit with `Retry-After`, logout revocation, OpenAPI |
| Components | Vitest + Testing Library | Contact form (shared-schema errors in the visitor's language, payload, rate-limit message), language tabs (keyboard, states), status labels, **translation files have identical keys** |
| End-to-end | Playwright | Sign-in, protected routes, create → preview → publish → edit privately → upload cover → unpublish → delete, language switching keeps the page, theme persistence, SEO tags, skip link, contact form, 404, mobile navigation without horizontal scroll |

---

## Environment variables

### API (`apps/api`)

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | | `development` · `test` · `production` |
| `PORT` | | Default `3333` |
| `PUBLIC_API_URL` | ✓ | Public origin of the API (local image URLs, OpenAPI server) |
| `CORS_ORIGINS` | ✓ | Site origin(s), comma-separated |
| `TRUST_PROXY` | | `1` on Vercel so the visitor IP is used for rate limits |
| `DATABASE_URL` | ✓ | PostgreSQL connection (Neon: **pooled** URL) |
| `DIRECT_URL` | ✓ | Direct connection used by migrations (Neon: unpooled URL) |
| `DATABASE_POOL_MAX` | | Connections per instance. Default 5; use 1 with PGlite |
| `SESSION_TTL_HOURS` | | Dashboard session lifetime. Default 168 (7 days) |
| `IP_HASH_SALT` | ✓ | 32+ random characters (`openssl rand -base64 48`) |
| `STORAGE_DRIVER` | | `local` · `vercel-blob` · `cloudinary` |
| `STORAGE_FOLDER`, `UPLOAD_DIR`, `MAX_UPLOAD_MB` | | Defaults `portfolio`, `uploads`, `4` |
| `BLOB_READ_WRITE_TOKEN` | with `vercel-blob` | Added by Vercel when a Blob store is connected |
| `CLOUDINARY_CLOUD_NAME`, `_API_KEY`, `_API_SECRET` | with `cloudinary` | |
| `MAIL_DRIVER` | | `log` (dev only) · `smtp` · `resend` |
| `MAIL_FROM`, `MAIL_TO` | ✓ | Sender, and the inbox that receives contact messages |
| `RESEND_API_KEY` | with `resend` | |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | with `smtp` | |
| `WEB_REVALIDATE_URL` | ✓ in production | `https://<site>/api/revalidate` |
| `REVALIDATE_SECRET` | ✓ in production | 32+ characters, identical in the web project |

### Web (`apps/web`)

| Variable | Required | Description |
| --- | --- | --- |
| `API_URL` | ✓ | API base URL used by the server (`https://<api>/api/v1`) |
| `NEXT_PUBLIC_API_URL` | ✓ | API base URL used by the browser (contact form). **Build-time** |
| `NEXT_PUBLIC_SITE_URL` | ✓ | Canonical site origin (hreflang, sitemap, Open Graph). **Build-time** |
| `REVALIDATE_SECRET` | ✓ in production | Same value as the API |

Secrets live only in Vercel project settings and GitHub environment secrets, never in the repository. `.env*` files are git-ignored except the examples.

---

## Deployment (Vercel, free tiers)

Two Vercel projects from **this one repository**, a Neon database, and image and email providers.

### 1. Database: Neon

1. Create a Neon project (EU region, e.g. Frankfurt). The `main` branch is **production**; create a `preview` branch for pull requests.
2. For each branch, copy the **pooled** connection string (`DATABASE_URL`) and the **direct** one (`DIRECT_URL`).

### 2. API project

1. Vercel → *Add New Project* → import the repository → **Root Directory** `apps/api`. `apps/api/vercel.json` sets the install and build commands for the monorepo.
2. Environment variables (Production and Preview each with their own database): see the table above, with `TRUST_PROXY=1`, `CORS_ORIGINS=https://<site-domain>`, `PUBLIC_API_URL=https://<api-domain>`.
3. Images: *Storage → Blob → Create* and connect it (adds `BLOB_READ_WRITE_TOKEN`), then `STORAGE_DRIVER=vercel-blob`. Or use Cloudinary.
4. Email: create a Resend API key, `MAIL_DRIVER=resend`. Until you verify a domain, use `MAIL_FROM="Portfolio <onboarding@resend.dev>"`; Resend then delivers only to your own account address, which is what `MAIL_TO` should be.

> Vercel deploys NestJS as a function. If its framework detection does not pick up `src/main.ts` on the first deploy, set *Framework Preset → NestJS* in the project settings.

### 3. Web project

1. Import the same repository again → **Root Directory** `apps/web`.
2. Set `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `REVALIDATE_SECRET`.
3. On the API project, set `WEB_REVALIDATE_URL=https://<site-domain>/api/revalidate`.

### 4. GitHub Actions

Both `vercel.json` files turn off Vercel's own Git deployments: GitHub Actions deploys only after CI passes.

Create two **environments** in *Settings → Environments*: `preview` and `production` (add yourself as a required reviewer on `production` for a manual gate). Secrets in each:

| Secret | Where to find it |
| --- | --- |
| `VERCEL_TOKEN` | vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Team settings → ID (or `.vercel/project.json` after `vercel link`) |
| `VERCEL_API_PROJECT_ID`, `VERCEL_WEB_PROJECT_ID` | Each project → Settings → General |
| `DATABASE_URL`, `DIRECT_URL` | The Neon branch for that environment (used to run migrations) |

Optional repository variable `API_HEALTH_URL` smoke-tests a custom domain instead of the deployment URL.

| Event | What runs |
| --- | --- |
| Pull request | CI → migrations on the preview database → preview API → health check → preview site → URLs commented on the PR |
| Push to `main` | CI → migrations on production → production API → health check → production site |

### 5. First content

```bash
# Against the production database, from your machine (DATABASE_URL/DIRECT_URL = production)
npm run admin:create -w apps/api -- --email you@example.com --name "Your Name"
```

Then sign in at `https://<site>/dashboard`, upload your photo, fill in the profile, publish.

### Independent deploys

- **Database**: `npx prisma migrate deploy` (in `apps/api`) with that environment's `DATABASE_URL`/`DIRECT_URL`. Migrations are additive and run before the API ships.
- **API**: `vercel deploy --cwd apps/api` (or re-run the workflow). The site keeps serving cached pages while the API redeploys.
- **Site**: `vercel deploy --cwd apps/web`. It needs the API only to build pages; if the API is down, pages show their empty states and fill in on the next revalidation.

---

## Editing content

| What | Where | Goes live |
| --- | --- | --- |
| Projects, profile, experience, education | Dashboard | On **Publish** (preview first with **Preview**) |
| Order, featured, homepage | Dashboard → Projects | Immediately |
| Technologies, categories, links, certificates | Dashboard | Immediately |
| Images | Dashboard → Images | Replacing a file updates every page using it |
| Interface text (buttons, headings) | `apps/web/messages/<locale>.json` | Next deploy; a test fails if a language misses a key |

---

## Known limits

- Vercel Hobby is for non-commercial use, which covers a personal portfolio. Functions have cold starts; visitors don't feel them because public pages are static.
- Serverless request bodies are capped at 4.5 MB. Images are resized in the browser first; very large GIFs are refused with a clear message.
- The Content-Security-Policy allows inline scripts because Next.js needs them for static pages; nonces would force every page to render dynamically.
