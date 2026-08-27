# Certificate

Certificate and document submission & management platform.

Applicants submit certificate requests through the public site; administrators
review, edit, approve or reject them in a protected admin panel, and generate
the certificate once a request is approved.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| ORM | Prisma 7 (`prisma-client` generator + driver adapters) |
| Database | MySQL 8.4+ / 9.x |
| Driver | `mariadb` via `@prisma/adapter-mariadb` (wire-compatible with MySQL) |
| Validation | Zod |
| Passwords | bcrypt |
| File storage | Local filesystem, behind a swappable path module |

## Prerequisites

- Node.js 20.19+ (developed on 25.x)
- A running MySQL server (8.4 or newer)

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    Then edit .env:
#    - set a database password inside DATABASE_URL / SHADOW_DATABASE_URL
#    - generate AUTH_SECRET:  openssl rand -base64 32
#    - set SEED_ADMIN_PASSWORD

# 3. Create the database and its dedicated user
cp scripts/init-database.sql.example scripts/init-database.sql
#    Replace REPLACE_WITH_A_STRONG_PASSWORD with the password you used above,
#    then run it as a MySQL administrator:
mysql -u root -p < scripts/init-database.sql

# 4. Create the tables
npm run db:migrate

# 5. Create the first administrator account
npm run db:seed

# 6. Start the dev server
npm run dev
```

Verify the database connection at <http://localhost:3000/api/health>.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Generate the Prisma client, then build for production |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create/apply a migration in development |
| `npm run db:migrate:deploy` | Apply existing migrations (production) |
| `npm run db:seed` | Create the initial administrator |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run db:reset` | Drop, re-migrate and re-seed (destructive) |

## Project structure

```
prisma/
  schema.prisma          Data model
  migrations/            Version-controlled schema history
  seed.ts                Bootstraps the first administrator
scripts/
  init-database.sql.example   Database + least-privilege user bootstrap
src/
  app/
    layout.tsx           Root layout, fonts, metadata
    page.tsx             Public homepage
    globals.css          Design tokens (@theme) — the single re-branding point
    api/health/          Database connectivity probe
  components/
    layout/              Site chrome (header, footer)
    ui/                  Reusable primitives (Button, Card, StatusBadge, states)
  lib/
    env.ts               Validated, server-only environment configuration
    prisma.ts            Prisma Client singleton + driver adapter
    constants.ts         Branding, status metadata, upload rules
    utils.ts             Formatting and class-name helpers
    auth/                Admin authentication          (Phase 3)
    storage/             Filesystem path resolution
    validations/         Zod schemas                   (Phase 2)
    certificate/         Certificate generation        (Phase 6)
  types/                 Shared application types
  generated/prisma/      Generated Prisma Client (git-ignored)
storage/                 Uploaded documents and generated certificates (git-ignored)
```

## Conventions

- **Secrets never reach the browser.** `src/lib/env.ts` and `src/lib/prisma.ts`
  import `server-only`, so importing them from a Client Component is a build
  error.
- **Database access is server-side only** — Server Components, Route Handlers
  and Server Actions. There is no database access from the client.
- **Validation runs twice.** Zod schemas in `src/lib/validations` are shared, but
  the server always re-validates; client-side validation is a convenience only.
- **Re-branding is one file.** Colours, radii, shadows and fonts are tokens in
  `src/app/globals.css`; the application name and support address live in
  `src/lib/constants.ts`.
- **Adding a submission status**: add the value to the `SubmissionStatus` enum in
  `prisma/schema.prisma`, migrate, then add one entry to
  `SUBMISSION_STATUS_META` in `src/lib/constants.ts`. Nothing else hard-codes a
  status.
- **Evolving form fields**: frequently searched fields are real columns; optional
  or short-lived fields go in the `additionalData` JSON column, so the form can
  change without a migration.
- **File storage is swappable.** Only relative paths are stored in the database
  and only `src/lib/storage/paths.ts` builds absolute paths, so the storage root
  can move to a mounted volume or object storage without touching the schema.

## Public request form

`/request` is the applicant-facing form. It collects name, email, optional
company and job title, a required location, optional comments, one required
document, and a required privacy consent.

### Field mapping

Existing `CertificateSubmission` columns are reused wherever they fit:

| Form field | Column |
|---|---|
| First + Last name | `applicantName` (originals kept in `additionalData`) |
| Email | `applicantEmail` |
| Company name | `companyName` |
| Job title | `applicantDesignation` |
| Location | `location` |
| Comments | `additionalNotes` |
| Document | `UploadedDocument` row |
| Privacy consent | `declarationAccepted`, `declaredBy`, `declaredAt` |

Every submission is created with status `PENDING`. Applicants cannot set or
change a status.

### Uploads

One PDF, or several documents bundled into one ZIP, up to 20 MB. The server
validates three independent things — declared size, extension, and the file's
leading magic bytes — because a filename and a MIME header are both supplied by
the client. Files are written under `STORAGE_ROOT/uploads/YYYY/MM/` with a
generated UUID name and mode `0640`; the original name is kept in the database
for display only.

### CAPTCHA — action required before production

Development uses Cloudflare's published **test keys**, already set in
`.env.example`. They call the real siteverify API but always return the same
verdict, so they are not a bypass — and they must not ship.

**Before deploying, you must supply:**

1. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — real Turnstile site key
2. `TURNSTILE_SECRET_KEY` — real Turnstile secret key

Get both from <https://dash.cloudflare.com/?to=/:account/turnstile>.

If a test key or no key is present in production, `src/lib/env.ts` throws on
first request and `verifyCaptchaToken` independently fails closed, so
submissions are refused rather than silently accepted.

### Branding — action required

No client brand name or logo is hard-coded. Set these once you confirm what we
are authorised to display:

1. `NEXT_PUBLIC_ORGANISATION_NAME` — name used in the consent sentence
2. `NEXT_PUBLIC_PRIVACY_POLICY_URL` — real privacy statement URL

While the URL is empty the privacy statement renders as plain text rather than
a dead link. No URL is invented.

## Admin authentication

`/admin/login` signs administrators in; everything under `/admin` requires a
session.

### How sessions work

Sessions are **server-side**, stored in `admin_sessions`. The cookie carries a
single opaque 256-bit random token and nothing else — no admin id, role or
email — so it is worthless to forge and reveals nothing if read. The database
stores only an HMAC-SHA256 of that token, keyed with `AUTH_SECRET`, so read
access to the sessions table does not allow impersonation.

This design was chosen over a self-contained signed token because logout must
genuinely revoke a session. Deleting the row ends it immediately; a stateless
token would stay valid until it expired no matter what the browser did.
Rotating `AUTH_SECRET` invalidates every session at once.

Cookie flags: `HttpOnly` (immune to XSS theft), `SameSite=Lax` (blocks
cross-site CSRF), `Secure` outside development, and an expiry matching
`AUTH_SESSION_MAX_AGE`.

### Authorisation

`src/lib/auth/authorize.ts` maps roles to permissions. Call sites ask
`can(role, "submission:edit")` rather than checking for a role name, so
re-scoping a role means editing one table. Navigation is filtered server-side,
so links an admin cannot use are never sent to the browser.

### Where the guard lives

`requireAdmin()` / `requirePermission()` in `src/lib/auth/dal.ts` are called by
the protected layout **and** by each protected page. Auth is enforced at the
point data is read, not delegated to a layout or to middleware — a layout alone
is not a security boundary.

`/admin/login` deliberately sits outside the `(protected)` route group so it
stays reachable while signed out, with no redirect loop.

### Environment variables

No new variables. Phase 1 already defined both:

- `AUTH_SECRET` — keys the session-token HMAC. Must be at least 32 characters;
  generate with `openssl rand -base64 32`. **Use a fresh value per environment.**
- `AUTH_SESSION_MAX_AGE` — session lifetime in seconds (default 28800 = 8 hours).

### Manual testing

1. `npm run dev`, then open <http://localhost:3000/admin> — you are redirected
   to `/admin/login`.
2. Sign in with `admin@certificate.local` and the password in
   `SEED_ADMIN_PASSWORD`.
3. You land on `/admin`. Refresh — the session persists.
4. Visit `/admin/login` while signed in — you are redirected back to `/admin`.
5. Click **Sign out** — you return to `/admin/login`, and `/admin` is blocked
   again.

### Not yet implemented

Login rate limiting / lockout after repeated failures is **not** included; it
belongs with the Phase 7 security pass. Until then, brute-force resistance rests
on bcrypt cost 12 and the strength of the admin password.

## Admin dashboard & submission management

### Routes

| Route | Purpose | Permission |
|---|---|---|
| `/admin` | Dashboard: status counts + recent submissions | `submission:read` |
| `/admin/submissions` | List with search, status filter, pagination | `submission:read` |
| `/admin/submissions/[id]` | Full detail, documents, history, status controls | `submission:read` |
| `/admin/submissions/[id]/edit` | Correct applicant details | `submission:edit` |
| `/api/admin/documents/[id]` | Guarded document download/view | `submission:read` |

### Querying

Counting, searching, filtering and paging all happen in MySQL. The browser only
ever receives the page it displays (20 rows, hard-capped at 100), so the panel
does not get slower as the table grows. Filter state lives in the URL, so a
filtered view is bookmarkable and survives a refresh.

### Document access

The browser sends only a document **id**. The stored path is read from the
database and resolved through `resolveStoragePath`, which refuses anything
outside the storage root — so the caller never chooses a path and traversal is
impossible by construction. Responses carry `X-Content-Type-Options: nosniff`,
a `sandbox` CSP (an inline PDF gets no scripting or network access) and
`Cache-Control: private, no-store`. ZIP archives are always sent as
attachments and are never extracted server-side.

### Status workflow

`src/lib/submissions/status.ts` holds one table of allowed transitions, used by
both the UI (which buttons appear) and the server action (which changes are
accepted):

```
PENDING       -> UNDER_REVIEW, REJECTED
UNDER_REVIEW  -> APPROVED, REJECTED, PENDING
APPROVED      -> COMPLETED, UNDER_REVIEW
REJECTED      -> UNDER_REVIEW
COMPLETED     -> (final)
```

Rejecting requires a remark, so a decision can always be reviewed later.
COMPLETED is final, and a COMPLETED submission can no longer be edited — an
issued certificate must not disagree with the record behind it.

**COMPLETED is not manually selectable.** It means "a certificate has been
issued", which is a consequence of certificate generation rather than a decision
someone makes. `changeStatusAction` refuses it outright before any lookup, and
`canTransition` returns false for it independently of the transition table, so
the rule survives a careless edit to that table. Certificate generation performs
the transition itself, in the same transaction that creates the Certificate row.

The invariant this protects is `status = COMPLETED` implies a certificate
exists. MySQL cannot express that declaratively — a CHECK constraint cannot
reference another table — so it is enforced in application logic at the two
places that can change it. If a submission is ever found in that invalid state,
the admin certificate card shows **Certificate record missing** and offers
**Recover Submission**, which returns it to APPROVED (audited, `certificate:generate`
required, refuses any submission that genuinely has a certificate) so a
certificate can then be generated properly. The public status page reports such
a request as approved and being prepared rather than claiming completion.

### Audit trail

`SubmissionRemark` stores both plain remarks and status changes; a row is a
history entry when `fromStatus`/`toStatus` are set. Edits are recorded too. No
separate history table exists, and none is needed.

### Authorisation

Every page and action calls `requirePermission(...)` itself. Hiding a button is
presentation only: an action invoked directly, with any id, still goes through
the same permission and workflow checks. This is covered by a test that replays
an administrator's action fields using a read-only reviewer's session — the
change is refused and nothing is written.

## Certificate generation

An APPROVED submission can be issued a certificate; doing so moves it to
COMPLETED, which is final.

### Certificate number

Development format: `CERT-YYYY-NNNNNN` (e.g. `CERT-2026-000001`) — a six-digit
sequence restarting each calendar year. The format lives entirely in
`formatCertificateNumber` in `src/lib/certificates/number.ts`; if the client
specifies a production format, only that function and its parser change.

The number is always generated server-side. Uniqueness is guaranteed by the
UNIQUE constraint on `certificates.certificateNo`, not by the allocator — the
allocator proposes, the database decides, and the caller retries if it loses a
race.

### Frozen snapshot

Everything the certificate needs is copied into `Certificate.snapshot` at issue
time, and the PDF is rendered from that snapshot rather than from a live read.
Editing the submission afterwards therefore cannot change an issued
certificate, and re-rendering a lost PDF reproduces the original exactly.

### Templates

`src/lib/certificates/templates/` holds one module per design, registered by
key in `index.ts`. `Certificate.templateKey` records which design produced a
certificate, so old certificates keep rendering with the design they were
issued under. Adding a design means adding a module — no generation logic
changes. A template receives only the snapshot: no database, filesystem or
environment access, which is what makes re-rendering reproducible.

### PDF generation

`pdfkit`, rendered server-side to a buffer. Chosen over a headless browser (no
Chromium to install or patch, no browser chrome to strip) and over
`@react-pdf/renderer`, whose dependency `@react-pdf/hyphenate` does not declare
the subpath its own code imports and fails to resolve under Node's strict
`exports` enforcement.

pdfkit reads its built-in font metrics from its package directory at runtime, so
it is listed in `serverExternalPackages` in `next.config.ts` and must not be
bundled.

### Consistency

The PDF is rendered and written to disk **before** the transaction commits. If
the transaction fails or loses a race, the orphaned file is deleted. This
ordering means a committed certificate always has its document; the reverse
order could leave a record whose file does not exist, which is a visible defect
rather than harmless garbage.

The transaction itself moves the submission with a conditional update
(`WHERE id = ? AND status = 'APPROVED'`), so a concurrent status change cannot
be lost, and the UNIQUE constraint on `certificates.submissionId` makes a second
certificate for the same submission impossible regardless of how many requests
arrive at once.

### Storage

`STORAGE_ROOT/certificates/YYYY/MM/<uuid>.pdf`, mode `0640`. Only the relative
path is stored in the database. Served through `/api/admin/certificates/[id]`
with the same guarantees as uploaded documents: id-addressed, path resolved
server-side, `nosniff`, a `sandbox` CSP and `no-store`.

### Verification QR code

Every certificate generated from now on carries a QR code in the lower-right of
the page, captioned "Scan to verify certificate". Scanning it opens the existing
public verification page — no second verification system exists.

It encodes exactly one thing:

```
${NEXT_PUBLIC_APP_URL}/verify/${certificateNumber}
```

Nothing else. No name, email, company, database id or file path goes into the
QR; the certificate number identifies the certificate and the verification page
decides what is safe to publish. The QR is not an authentication mechanism —
anyone can scan it, and security comes from that page's existing privacy rules.

**Library:** `qrcode` (server-side, pure JS), drawn into the existing pdfkit
template as a PNG. Error correction **Q** (~25% recoverable) with the
specification's 4-module quiet zone, rendered at 600px and placed at 92pt —
roughly 470 DPI, so it survives printing and photocopying. Only a width is
given to `doc.image`, so the code can never be stretched out of square.

**Nothing is stored.** No QR table, no QR column, no image on disk, and the
frozen snapshot is unchanged. A QR is deterministically reproducible from the
configured domain plus the certificate number.

The verification URL is passed into the template as an explicit render context
rather than read from the environment by the template itself, which preserves
the rule that a template only knows what it is handed.

#### Domain configuration — required for production

`NEXT_PUBLIC_APP_URL` is the only place the domain comes from. Set it to the
real public origin before issuing certificates in production:

```
NEXT_PUBLIC_APP_URL="https://client-domain.com"
```

A certificate is a permanent document — one issued while this points at the
wrong host will carry an unscannable QR forever. There is no way to fix that
except reissuing.

#### Scanning during development

In development the QR encodes `http://localhost:3000/...`, which is correct but
**cannot be scanned from a phone**: `localhost` refers to the phone itself, not
the development machine. This is expected and is not worked around by baking in
a LAN IP address, which would produce certificates that stop verifying the
moment the network changes.

To test scanning with a real phone, point `NEXT_PUBLIC_APP_URL` at a temporary
public tunnel (ngrok, Cloudflare Tunnel, or similar) and generate a certificate
while that value is set.

#### Existing certificates

Certificates issued before QR support keep their original PDFs. Nothing
regenerates them: a stored PDF is only ever written once, at issue time.
Reissuing an old certificate with a QR would be a separate, deliberate feature.

### Organisation branding — action required

Nothing is branded by default. Until `NEXT_PUBLIC_ORGANISATION_NAME` is set,
every certificate is stamped **ORGANISATION NOT CONFIGURED** across the page so
a development certificate cannot be mistaken for an issued one. Optional
`ORGANISATION_ADDRESS` and `ORGANISATION_WEBSITE` appear in the footer.

## Public request status tracking

Applicants track a submitted request by its reference ID. This is a **separate
feature from certificate verification** — different input, different lookup,
different data:

| | Input | Shows |
|---|---|---|
| `/status` | Reference ID (`CRT-YYYY-XXXXXX`) | Request progress |
| `/verify` | Certificate number (`CERT-YYYY-NNNNNN`) | Issued certificate + PDF |

| Route | Purpose |
|---|---|
| `/status` | Reference ID lookup form (`?reference=` prefills it) |
| `/status/[reference]` | Status result — bookmarkable |

### Lookup

Uses the existing `referenceNo` column, which is already `@unique` and
therefore indexed — a single equality match, no new identifier, no migration.
Only the columns the page needs are selected.

### What is published

Reference ID, applicant name (see below), submission date, current status, its
applicant-facing explanation, the progress timeline, and — only once a
certificate is issued and publicly verifiable — the certificate number with a
link to `/verify`.

Withheld: email, phone, database ids, submitter IP, uploaded documents, file
paths, admin identities, and the **text of every remark**. The status query
selects only `toStatus` and `createdAt` from `SubmissionRemark`; `message` is
never read, so an internal note cannot reach the public page.

### Applicant name

`NEXT_PUBLIC_STATUS_APPLICANT_NAME` controls this, defaulting to **`masked`**
("MAMTA SAINI" → "MAMTA S."). Enough for an applicant to recognise their own
request without publishing a full name to anyone holding the reference. Set
`full` or `hidden` once the client decides. Reference IDs are random (32^6 ≈ 1
billion), not sequential, so they are not enumerable.

### Timeline

Built from the existing `SubmissionRemark` status history — no second history
system. Stages are marked reached from the current status, because the workflow
only allows arriving at a status by passing through the earlier ones. Dates come
from recorded history and are left blank when unknown: a stage is never given an
invented timestamp, and an unreached stage is never drawn as complete. A
rejected request shows the path actually taken and stops there.

### Privacy of the result URL

`/status/[reference]` is `noindex` and sends `Referrer-Policy: no-referrer`, so
a reference ID is not handed to search engines or to any site linked from the
page.

## Public certificate verification

Anyone can verify a certificate without an account.

| Route | Purpose |
|---|---|
| `/verify` | Certificate number lookup form |
| `/verify/[certificateNumber]` | Verification result — shareable and bookmarkable |
| `/api/verify/certificates/[certificateNumber]/pdf` | The issued PDF (`?download=1` to save) |

Results live at their own URL rather than behind a POST, so they can be
bookmarked, shared, and later encoded into a QR code without changing anything.

### Source of truth

Results are built from `Certificate.snapshot` — the data frozen when the
certificate was issued — never from the live submission. Editing a submission
afterwards does not change what verification reports.

### What is published

Only these fields: certificate number, applicant name, company, job title,
location, issue date, issuing organisation, and verification status. Every one
is copied out explicitly in `src/lib/certificates/verify.ts`, so a column added
to the schema later cannot silently become public.

Deliberately withheld from the page: database ids, the submission id, the
internal reference number, admin identities, the workflow status, remarks, the
submitter's IP, the stored file path, and the applicant's email.

### Status rules

A certificate verifies only when its submission is `COMPLETED` and it has not
been revoked. Revoked certificates report **Not currently valid** with the
number and issue date but no personal details and no PDF; the revocation reason
is internal and is never published. Everything else — unknown number, malformed
input, a submission still in the workflow — returns the identical "not found"
page, so responses cannot be used to probe which numbers exist.

### PDF access

The stored Phase 5 file is streamed as-is; nothing is rendered at verification
time, so a downloaded certificate is byte-for-byte the document that was
issued. The caller supplies a certificate number, never a path: the relative
path is read from the database and resolved through `resolveStoragePath`, which
refuses anything outside the storage root.

### Rate limiting

`src/lib/rate-limit.ts` is a small in-memory fixed-window limiter (30 requests
per minute per caller on the PDF endpoint). It exists because certificate
numbers are sequential and therefore guessable.

**It is not sufficient on its own**: state is per-process (so behind a load
balancer the effective limit multiplies by the instance count), it resets on
deploy, and it keys on `X-Forwarded-For`, which only means anything behind a
proxy that sets it truthfully. Put a real limiter or WAF rule in front of the
app in production. Swapping the implementation touches only that one file.

### Verification logging

Not implemented, and no table was added. Verification needs no log to work, and
logging would mean storing the IP addresses of people checking certificates —
a privacy cost with no stated benefit. If it is wanted later, it should be a
deliberate decision with a defined retention period.

## Deployment notes

The application is a standard Next.js server app — no cloud-specific services
are used.

1. Provision MySQL and run `scripts/init-database.sql` against it.
2. Set the environment variables from `.env.example` on the server, with a
   freshly generated `AUTH_SECRET`.
3. Point `STORAGE_ROOT` at a persistent directory **outside** the deployment
   folder (e.g. `/var/app/storage`) so uploads survive redeploys.
4. `npm ci && npm run build`
5. `npm run db:migrate:deploy`
6. `npm start` behind a reverse proxy with TLS.

Prefer a TLS database connection in production (`?ssl=true`) over
`allowPublicKeyRetrieval=true`, which is a local-development convenience.
