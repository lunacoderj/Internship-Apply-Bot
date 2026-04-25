# ApplyPilot Testing Guide 🧪

This guide explains how to test the platform in various environments.

## 1. Local Development Testing

### Backend Health Check
Verify the server, database, and Redis are connected:
```bash
curl http://localhost:3000/health
```
*Expected Output:* `{"server":"ok", "supabase":"ok", "redis":"ok", ...}`

### Mocking a Webhook (Email Notification)
Simulate a job notification from Resend/Email:
```bash
curl -X POST http://localhost:3000/webhook/resend \
  -H "Content-Type: application/json" \
  -d '{
    "id": "mock_event_123",
    "subject": "New Internship: Frontend Engineer at Google",
    "text": "Check out this job at https://careers.google.com/jobs/results/12345"
  }'
```
*Check:* Watch the backend logs to see if the job is parsed and added to the queue.

### Monitoring Queues
Open your browser to:
`http://localhost:3000/admin/queues`
*User:* `admin`
*Pass:* (Set in `.env` as `ADMIN_PASSWORD`)
*Check:* You should see the `applicationQueue` and any pending/completed jobs.

---

## 2. API Validation Testing

Use **Postman** or **Insomnia** to test the hardened endpoints:

### Authenticated Route Test
Try to list applications without a Supabase token:
`GET http://localhost:3000/api/applications`
*Expected:* `401 Unauthorized`

### Input Validation (Zod) Test
Try to delete a key with an invalid ID:
`DELETE http://localhost:3000/api/keys/invalid-id`
*Expected:* `400 Bad Request` with a JSON error detailing the validation failure.

---

## 3. Production Readiness Tests

### Docker Validation
Build the production image locally to ensure all dependencies (Python/ApplyPilot) are correct:
```bash
cd backend
docker build -f Dockerfile -t applypilot-backend .
```

### Load Testing
Run the k6 script to check for Redis/Worker bottlenecks:
```bash
k6 run backend/scripts/k6/load-test.js
```

---

## 4. Troubleshooting

| Issue | Check |
| :--- | :--- |
| **CORS Errors** | Ensure `FRONTEND_URL` in `.env` matches your browser URL exactly. |
| **Queue Stuck** | Ensure Redis is running and `REDIS_URL` is correct. |
| **ApplyPilot Fails** | Ensure Chromium and Python 3 are installed (included in Docker). |
| **Auth Errors** | Check if `SUPABASE_URL` and `SUPABASE_ANON_KEY` are valid. |
