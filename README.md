# Trimurya Enterprise CRM

Full-stack project management CRM for Trimurya Corporation.

## Stack

- Frontend: React.js, Vite, Tailwind CSS, Lucide React, Recharts
- Backend: Node.js, Express.js, MongoDB, Mongoose
- Auth: JWT, bcrypt password hashing, role-based route protection
- Uploads: Multer memory uploads with private Cloudflare R2 storage
- API: REST endpoints under `/api`

## Project Structure

```text
backend/
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    seed/
  uploads/
frontend/
  src/
    components/
    context/
    data/
    pages/
    utils/
```

## Backend Setup

```bash
cd backend
npm install
copy .env.example .env
npm run seed
node server.js
```

### Cloudflare R2 project documents

Project documents use a private Cloudflare R2 bucket and are streamed only to authenticated users who can access the project. A Super Admin can configure and verify R2 from the CRM **Settings** page. Credentials are encrypted in MongoDB using `SETTINGS_ENCRYPTION_KEY` and are never returned to the browser.

Set a permanent encryption key in `backend/.env` before saving credentials:

```env
UPLOAD_DRIVER=r2
SETTINGS_ENCRYPTION_KEY=replace-with-a-separate-long-random-secret
```

Environment-based R2 credentials remain supported as a deployment fallback. Do not add credentials to the frontend environment or commit `backend/.env`.

### Automatic project notifications

Creating a project automatically queues in-app, email, and WhatsApp notifications for its assigned active employees, vendors, and freelancers. When a project has no explicit assignments, all active employees, vendors, and freelancers are notified. Email uses SMTP. WhatsApp uses a Meta-approved template with body parameters in this order: recipient name, project name, project code. Configure the variables documented in `backend/.env.example`; delivery attempts and failures appear under **Activity → Notification Deliveries**.

If only the demo administrator login is missing or its password must be reset, run this non-destructive command instead of reseeding the whole database:

```bash
cd backend
npm run admin:ensure
```

Default API URL: `http://localhost:5000`

Demo users after seeding:

```text
superadmin@trimurya.com / password123
admin@trimurya.com / password123
employee@trimurya.com / password123
vendor@trimurya.com / password123
freelancer@trimurya.com / password123
```

## Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Default frontend URL: `http://localhost:5173`

For production, configure the data source through deployment environment variables instead of changing source files:

```env
# Frontend deployment (Vercel)
VITE_API_URL=https://your-api.onrender.com/api

# Backend deployment (Render)
MONGO_URI=mongodb+srv://user:password@cluster.example/trimurya_crm
CLIENT_URL=https://your-frontend.example
```

After changing `VITE_API_URL`, redeploy the frontend because Vite reads it at build time. After changing `MONGO_URI` or `CLIENT_URL`, restart/redeploy the backend. The Atlas cluster and database in `MONGO_URI` must match the database being inspected in Atlas Data Explorer.

## API Modules

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/register`
- `GET /api/dashboard`
- `/api/projects`
- `/api/candidates`
- `/api/vendors`
- `/api/freelancers`
- `/api/employees`
- `/api/allocations`
- `/api/tasks`
- `/api/payments`
- `/api/invoices`
- `/api/reports`
- `/api/notifications`
- `POST /api/uploads`

Resource endpoints support standard REST actions:

```text
GET /
POST /
GET /:id
PUT /:id
DELETE /:id
```

## Roles

- `super_admin`: full access
- `admin`: project manager/admin access
- `employee`: assigned employee records, projects, allocations, and tasks
- `vendor`: assigned vendor projects, allocations, and tasks
- `freelancer`: assigned freelancer projects, allocations, and tasks

## Notes

- MongoDB must be reachable before `npm run seed` or `node server.js`. For MongoDB Atlas, add the current machine's IP address under Network Access.
- Local file uploads are stored in `backend/uploads`.
- Cloudflare R2 private object storage and authenticated downloads are enabled.
- Reports can be viewed in-app and exported as CSV.
# pmcrm
