# Certificate

Certificate and document submission & management platform.

Applicants submit certificate requests through the public site; administrators
review, edit, approve or reject them in a protected admin panel, and generate a
certificate once a request is approved.

## Stack

| Layer | Choice |
|---|---|
| Framework | Laravel 13 |
| Language | PHP 8.3 |
| Templating | Blade |
| Styling | Tailwind CSS 4 (built with Vite) |
| ORM | Eloquent |
| Database | MySQL 8.4+ / 9.x |
| PDF | mPDF |
| QR | endroid/qr-code |

## Requirements

- **PHP 8.3+** with: `pdo`, `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`,
  `xml`, `ctype`, `json`, `fileinfo`, `curl`, `gd`, `zip`, `bcmath`
  (`gd` is required by the QR generator; `zip` by mPDF)
- **Composer 2**
- **MySQL 8.4 or newer**
- **Node.js** — for building CSS only. The server never runs Node; you build
  assets locally and deploy the compiled `public/build/` directory.

## Local setup

```bash
composer install
npm install && npm run build      # compiles Tailwind into public/build/

cp .env.example .env
php artisan key:generate
#   then set DB_* , APP_URL and ORGANISATION_NAME in .env

php artisan migrate               # no-op on an existing database
php artisan serve
```

Verify the database connection at <http://localhost:8000/health>.

To create the first administrator on a fresh database:

```bash
php artisan tinker --execute="
App\Models\Admin::create([
  'email' => 'admin@example.com', 'name' => 'System Administrator',
  'passwordHash' => Hash::make('a-strong-password'),
  'role' => 'SUPER_ADMIN', 'isActive' => true,
]);"
```

## Project structure

```
app/
  Enums/            SubmissionStatus, AdminRole
  Models/           Eloquent models mapped onto the existing schema
  Http/
    Controllers/    Public/ and Admin/
    Requests/       Form request validation
    Middleware/     EnsureAdminIsActive
  Services/         Business logic (see below)
  Support/          Permission table
config/certificate.php    All application configuration
database/migrations/      Baseline schema + data migrations
resources/views/          Blade views, incl. the certificate template
routes/web.php            Public and admin routes
storage/uploads/          Applicant documents (private)
storage/certificates/     Generated certificate PDFs (private)
```

### Services

| Service | Responsibility |
|---|---|
| `SubmissionCreator` | Persists a public request (submission + document, one transaction) |
| `DocumentStorage` | Upload validation (size, extension, **magic bytes**) and path resolution |
| `SubmissionWorkflow` | Status transition rules |
| `CertificateIssuer` | Certificate generation, staged for consistency |
| `CertificateNumberAllocator` | `CERT-YYYY-NNNNNN` numbering |
| `CertificateRenderer` | Snapshot → PDF via mPDF |
| `CertificateQrGenerator` | Verification URL + QR image |
| `CertificateVerifier` | Public certificate verification |
| `RequestStatusService` | Public request status + timeline |

## Routes

| Route | Purpose |
|---|---|
| `/` | Home |
| `/request` | Public request form |
| `/status`, `/status/{reference}` | Request status tracking |
| `/verify`, `/verify/{certificateNumber}` | Certificate verification |
| `/verify/{certificateNumber}/pdf` | Public certificate PDF |
| `/admin/login` | Admin sign in |
| `/admin` | Dashboard |
| `/admin/submissions{,/{id},/{id}/edit}` | Submission management |
| `/admin/documents/{id}`, `/admin/certificates/{id}` | Guarded file access |

## Key behaviours

**The database schema predates Laravel.** It uses cuid string primary keys,
camelCase columns and per-table timestamp names (`submittedAt`, `uploadedAt`,
`issuedAt`). The models declare all of this explicitly rather than renaming
columns, so existing data keeps working. `$dateFormat` is set to millisecond
precision to match the `datetime(3)` columns — without it, rows created in the
same second could not be ordered deterministically.

**COMPLETED is not manually selectable.** It means "a certificate has been
issued", so only certificate generation may set it, via an atomic
compare-and-set in the same transaction that creates the Certificate row.
`SubmissionWorkflow::canTransition()` refuses it regardless of the transition
table, and the controller refuses it before any lookup.

**The certificate snapshot is frozen.** Everything a certificate needs is
copied into `Certificate.snapshot` at issue time, and both the PDF and public
verification read the snapshot — never the live submission. Editing a
submission afterwards cannot change an issued certificate.

**Generation is staged for consistency.** The PDF is rendered and written to
disk *before* the transaction commits, and deleted if it rolls back, so a
committed certificate always has its document.

**Uploads are validated by content.** Size, extension and the file's leading
magic bytes are all checked; a filename and a MIME header are both supplied by
the client and are not trusted.

**Files are never public.** Only relative paths are stored, and every path is
resolved against the storage root with anything outside it refused. Documents
and certificates are served through guarded routes addressed by id.

**Public pages publish only whitelisted fields.** Applicant names are masked by
default on the status page (`STATUS_APPLICANT_NAME`), and remark text is never
read by the public status query.

## Configuration required before production

| Variable | Why |
|---|---|
| `APP_URL` | The QR code encodes `{APP_URL}/verify/{number}`. A certificate is permanent — one issued against the wrong host carries a dead QR forever. |
| `APP_DEBUG=false`, `APP_ENV=production` | Never expose stack traces. |
| `ORGANISATION_NAME` | Until set, every certificate is stamped **ORGANISATION NOT CONFIGURED**. |
| `PRIVACY_ORGANISATION_NAME`, `PRIVACY_POLICY_URL` | The consent sentence. No URL is invented; it renders as plain text while empty. |

### QR scanning in development

The QR encodes `http://localhost:8000/...`, which **cannot be scanned from a
phone** — `localhost` refers to the phone itself. This is expected and is not
worked around by baking in a LAN IP, which would produce certificates that stop
verifying when the network changes. To test with a real phone, point `APP_URL`
at a temporary tunnel and generate a certificate while it is set.

## cPanel deployment

Requires only PHP, MySQL and Composer — no Node, Docker or VPS on the server.

1. Build assets locally: `npm run build`, and deploy `public/build/`.
2. Upload the project **above** `public_html`; point the domain's document root
   at the project's `public/` directory. Never expose the project root.
3. `composer install --no-dev --optimize-autoloader`
4. Set `.env` (see the table above), then `php artisan key:generate`.
5. `php artisan migrate --force`
6. `php artisan config:cache route:cache view:cache`
7. Ensure `storage/` and `bootstrap/cache/` are writable by PHP.
8. Keep `storage/uploads` and `storage/certificates` **outside** the web root —
   they are private and are served only through the guarded routes.

If the host cannot repoint the document root, add a `.htaccess` in the account
root that rewrites into `public/`; do not move `index.php` out of `public/`.
