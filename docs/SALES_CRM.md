# Sales & Business Development

The Sales module is mounted at /sales/:page in the existing React application and /api/sales in Express. It reuses CRM JWT/API-key authentication, existing users and employees, Operations projects, encrypted communication settings, and the existing invoice collection.

## Development and deployment

Use Node 20.19 or newer and MongoDB Atlas or a MongoDB replica set. A standalone MongoDB server cannot execute the transactions used to keep Sales changes and audit records atomic.

1. Back up the existing database before deploying.
2. Install backend and frontend dependencies with **npm ci** in each directory.
3. Configure the existing environment variables below.
4. Run **npm run sales:migrate** from backend. This creates Sales collections and indexes without seeding client records, replacing CRM data, or removing existing indexes.
5. Run **npm test** from backend and **npm run build** from frontend.
6. Start the API using the existing **npm start** command. Host frontend/dist with SPA fallback and configure /api to reach the API, or set VITE_API_URL before building.
7. Sign in as an existing CRM administrator. Create Sales settings, link existing accounts in Sales Team, then configure Sales roles and permissions.
8. Verify the end-to-end workflow in a staging environment before exposing it to users.

Existing invoices remain unchanged. Their default interpretation is Payable. Only explicitly recorded direction: Receivable invoices linked to a Sales deal count as client invoiced revenue or collected customer payments. Existing payment collections represent payouts and are excluded from Sales revenue.

The migration must be run once per target database before the new routes are used. MongoDB credentials need normal collection/index and GridFS access. No environment credentials are returned by Sales APIs.

## Environment variables

| Variable | Purpose |
| --- | --- |
| MONGO_URI | Existing database connection, with replica-set support |
| JWT_SECRET | Existing CRM authentication secret |
| CLIENT_URL | Existing CORS allowlist, comma-separated |
| PORT | Existing API listen port |
| NODE_ENV | Set to production in deployment |
| VITE_API_URL | Frontend API base, e.g. /api or the API origin plus /api |
| SETTINGS_ENCRYPTION_KEY | Existing encryption configuration; follow existing encryption utility requirements |
| SMTP_HOST, SMTP_PORT, SMTP_SECURE | Authorized SMTP provider connection |
| SMTP_USER, SMTP_PASS, SMTP_FROM | SMTP credentials/from identity, supplied through secure environment storage |
| SALES_RATE_LIMIT | Authenticated Sales requests per user per minute, default 180 |
| SALES_TEST_MONGO_VERSION | Optional isolated-test binary version, default 7.0.14 |

Use the existing administrator communication settings to store encrypted SMTP credentials instead of putting passwords in Sales settings. Sales uses a direct TLS-capable SMTP transport; SMTP credentials are not sent to the frontend or an email relay.

## Permissions and ownership

CRM Super Admin and Admin accounts administer Sales configuration. Super Admin can access all Sales business records. Other accounts, including Admin, can access only business records they created. Creator ownership is immutable and assignments or legacy sharing do not grant record access.

Sales permission records refer to existing User IDs. Roles are Sales Head, Sales Manager, Senior BDE, BDA, Sales Coordinator and Read-only Auditor. Legacy all-record grants are ignored. Module action overrides cover view, create, edit, delete, export and approve. Assignment is disabled. Only CRM administrators can change permissions and global settings. Official pricing changes additionally require a Sales manager role.

Module keys are documented in backend/src/sales/config.js. The permissions screen provides a checkbox matrix. Sales date/time inputs use the record time zone or Sales/browser time zone; timestamps are stored in UTC. Frontend visibility follows the server's computed permissions; backend checks remain authoritative.

New leads and linked records automatically use the logged-in user as owner. Contacts and company profiles are creator-scoped. Reassignment and sharing are unavailable.

Updates and actions require the current record version; stale changes return 409. Approved/finalized commercial records and linked records have deletion guards. Transactions ensure audit inserts succeed with business writes.

## Workflow

1. Save manual company research. Source URLs describe the authorized source used; the app does not invent company facts or perform external scraping.
2. Convert research to a lead. A company is created and linked if needed. Company/email/service combinations use a duplicate key.
3. The lead automatically belongs to the logged-in creator.
4. Record outreach, replies, calls and meetings. Lead/call/LinkedIn follow-up dates create linked follow-up records. Communication History includes actual recorded changes.
5. Create qualification details, qualify, then convert to a linked opportunity.
6. Progress the deal through server-validated stages.
7. Create a quotation. Totals use (quantity × unit rate − discount) × (1 + tax / 100).
8. Submit and approve the quotation, send through configured SMTP, then record the client's acceptance.
9. Upload NDA/MSA/SOW documents and verify signed evidence as an authorized manager.
10. Mark the deal won from the NDA / Contract stage. It requires an accepted proposal and verified signed commercial agreement or SOW.
11. Complete onboarding, including verified NDA and agreement evidence and a project manager.
12. Submit and approve handover. Approval atomically creates an existing Operations Project and links its unique ID to the handover and deal.
13. Record customer invoices and verified payment references under Revenue & Forecast.

Operations currently supports INR and USD projects. Sales can track EUR and GBP, but these deals require commercial conversion before an Operations handover is approved.

## Documents and integrations

Sales files are stored in private MongoDB GridFS, never under the existing public /uploads directory. Every download verifies access to the parent record. Limits: 10 MB per file, five uploads per request and twenty retained files per record. Basic content signatures are checked for PDF, image and Office formats. Files are untrusted downloads and are not executed on the server. Versioned contract records retain their files and signature evidence.

A signed contract requires an uploaded evidence file, signature date and manager verification notes. Uploading a file alone cannot mark it signed.

Drafts, templates, manually recorded replies, sent history and scheduled messages persist in MongoDB. Sent means the configured provider accepted the message; the application does not claim delivered/read status. Replies are manually recorded, not automatically tracked. Scheduled emails are processed every 30 seconds by the running API, using atomic claims to avoid concurrent sends.

Provider calls are external side effects. If a provider accepts a message but the subsequent database commit fails, the record may remain Sending. Do not automatically retry these records: verify provider logs before resolving them. This prevents silent duplicate sends.

Google Meet, Teams and Zoom meeting links are stored and opened manually. Provider-side calendar synchronization is not enabled without an authorized integration. LinkedIn outreach is manual tracking and profile opening, without scraping or bulk messaging. CRM Integrations settings are descriptive configuration; secrets belong in secure existing settings/environment storage.

## Imports, exports and metrics

Lead, contact and research imports accept CSV and XLSX, maximum 1000 rows per request. Use exported column names or field keys; reference columns accept accessible record names, emails, record IDs, or MongoDB IDs (use IDs when names are ambiguous). Invalid/duplicate rows are rejected with row-specific errors. Formulas and rich spreadsheet objects are not accepted. A lead without a company ID creates its company from the Company / Lead Name. For an existing company, supply its name or ID.

Exports support XLSX, CSV and PDF and respect record scope and filters. Export at most 10,000 records per request. Spreadsheet cells are escaped to prevent formula injection. Analytics export includes computed measures.

Dashboards do not seed or fabricate production data. Currency filters prevent summing unrelated currencies. Pipeline forecast, verified contracted values, client invoices and collected payments are separate. Empty charts and tables provide empty states. Email response rate is based on manually recorded company replies, not provider telemetry.

Analytics processes up to 50,000 matching records per module; larger periods require narrower filters. Table, Kanban, meeting and timeline views retain the selected pagination and filters.

## Tests

**npm test** includes the existing project-share regression tests and backend/tests/sales.test.js. Sales tests start an isolated MongoDB replica set; they never use the production MONGO_URI. The first run downloads a MongoDB test binary and requires network access and local disk space.

Integration coverage includes real authentication, lead creation, duplicate rejection, owner isolation, automatic creator ownership, research conversion, follow-ups, meetings, qualification, quotations, approval, provider-status handling, secure file authorization, signature verification, win validation, onboarding, Operations handover, customer invoices/payments, import/export and every resource's list API. SMTP is mocked only inside isolated tests; tests never send client messages.
## Settings examples

Sales Settings accepts arrays of strings for custom lead statuses, deal stages, lead sources and service categories.

Follow-up Rules is an object with autoCreate (boolean), defaultDays (0–365), and contractReminderDays (0–365). For example: {"autoCreate":true,"defaultDays":3,"contractReminderDays":30}.

Notification Preferences supports followups, contractExpiry and leadAssignments booleans. Pending follow-up and contract-expiry notifications are generated in the existing notification collection every ten minutes, with a unique daily key to prevent duplicates. Up to 500 oldest pending records per reminder category are processed per cycle.

Approval Workflows supports minimumQualificationScore and minimumWinProbability (0–100). Mandatory proposal approval, verified contract signatures, and Operations handover approvals remain enforced.

When duplicate detection is disabled, new records do not reserve a duplicate key. Re-enabling it guards subsequent writes; review records added while it was disabled before relying on a clean historical dataset.

Sales business records now use immutable createdBy ownership. Super Admin can access every user?s Sales records; other roles, including Admin, remain creator-scoped. Assignment and sharing cannot grant access. New records automatically belong to the logged-in creator; duplicate detection is scoped to that creator. Global settings and permission administration remain configuration controls. Existing records retain their original creator. Run sales:migrate to create the new creator index.

Central Access Control now lists the Sales section and all 26 pages. Keys are sales and sales-<page-slug>. Sales action controls include view/create/edit/delete/export/approve. Controls apply to supported actions on each page. The permissions dialog also offers Enable all Sales modules and Disable all Sales modules. Explicit central permissions override legacy Sales module grants and role defaults, while creator isolation for non-Super-Admin users, administrator-only configuration, and pricing validation remain enforced. Super Admin retains administrative access. API keys inherit their active owner?s central permissions and cannot exceed the key role. Existing users keep role defaults until Sales permissions are saved. No migration of users is required.

Email Outreach uses a Gmail-style compose window with CC/BCC, preview, CRM links, Send and Save Draft. Select attachments repeatedly to accumulate up to five new files per save, 10 MB per file, with a server-enforced 25 MB total for email attachments. Upload failures keep the draft open and prevent sending. Personal plain-text signatures are stored on the existing User record under salesEmailPreferences, editable in Sales Settings, CRM Settings, and the compose settings panel. Automatic signatures are inserted once in new message bodies; saved drafts retain their original body. Sending uses the actual configured SMTP provider and secure stored attachments.

Company linking is optional for standalone email outreach. Sent emails that are linked to a company retain CRM activity history. Provider errors leave the draft editable and reload its latest version for retry.

Access Control includes the complete Sales Roles & Permissions editor as an embedded section. It reuses the same real CRUD API, role forms, permission matrix, audit logging, and authorization as /sales/permissions; the standalone route remains available. Central user access overrides legacy Sales role grants.

CRM sidebar and login branding use the official Trimurya Corporation vector logo, stored locally at frontend/public/branding/trimurya-logo.svg. Original source: https://trimuryacorporation.in/assets/trimurya-logo-vector.svg. No runtime requests to external logo hosts are needed.
