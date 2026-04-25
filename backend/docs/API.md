# ApplyPilot API Documentation

All API endpoints (except `/health` and `/webhook`) require authentication via a Bearer token.

## Authentication
Include the following header in your requests:
`Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`

---

## 1. Applications (`/api/applications`)

### GET `/api/applications`
Fetch a paginated list of job applications.
- **Query Params**:
  - `status`: Filter by status (`pending`, `success`, `failed`, `skipped`).
  - `platform`: Filter by job board (`LinkedIn`, `Indeed`, etc.).
  - `page`: Page number (default: 1).
  - `limit`: Results per page (default: 20).

### GET `/api/applications/stats`
Get aggregated statistics for the user's applications.

### GET `/api/applications/:id`
Get detailed information for a specific application.

### PATCH `/api/applications/:id/mark-applied`
Manually mark an application as successful.
- **Body**: `{ "job_title": string, "company_name": string }`

### POST `/api/applications/:id/retry`
Re-enqueue a failed application for processing.

---

## 2. API Keys (`/api/keys`)

### GET `/api/keys`
List active API keys (returns hints only, never full values).

### POST `/api/keys`
Store a new API key.
- **Body**: `{ "key_name": string, "key_value": string }`

### DELETE `/api/keys/:id`
Remove an API key.

---

## 3. Webhooks

### POST `/webhook`
Internal endpoint for receiving automation events. Requires signature verification.

---

## 4. System

### GET `/health`
Returns the health status of the server, database, and Redis.
