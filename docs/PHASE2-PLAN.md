# Phase 2 Plan: RunningHub + Feishu Integration

**Generated:** 2026-03-20
**Scope:** Complete Phase 2 (Scope A)

---

## Data Flow

```
User submits form
  → Server Action: submitTask(appCode, formData, session)
    1. Prisma: Create Task (status=QUEUED)
    2. Feishu: Create record (status=QUEUED)
    3. For each image: POST /media/upload/binary → download_url
    4. Map form data to nodeInfoList via app.requestMappingJson
    5. POST /openapi/v2/run/ai-app/{appId}
       → Get taskId from RunningHub response
    6. Prisma: Update taskId + status=RUNNING
    7. Return taskId to client

  → Completion (two paths, parallel):
    A. Webhook callback (RunningHub pushes) → fastest
    B. Cron polling every minute (fallback)

  → On completion:
    1. Prisma: Update status + providerResultUrl
    2. Prisma: Create TaskAsset records (OUTPUT)
    3. Feishu: Update record (status=SUCCESS/FAILED)
    4. SSE: Push update to online clients
```

---

## File Inventory

### New Files (8)

| File | Purpose |
|------|---------|
| `src/lib/runninghub.ts` | RunningHub API client: submit, query, upload |
| `src/lib/feishu.ts` | Feishu SDK: create/update records in multi-dimensional table |
| `src/lib/task-queue.ts` | pumpQueuedTasks() + webhook handler |
| `src/lib/sse.ts` | Server-Sent Events emitter for real-time updates |
| `src/app/api/webhook/route.ts` | RunningHub webhook POST endpoint |
| `src/app/api/internal/tasks/submit/route.ts` | Task submission API |
| `src/app/api/internal/tasks/poll/route.ts` | Cron polling API (fallback) |
| `src/app/(workspace)/apps/[code]/submit-form.tsx` | Real form replacing placeholder button |

### Modified Files (~10)

| File | Change |
|------|--------|
| `src/app/(workspace)/apps/[code]/page.tsx` | Replace placeholder buttons with submit-form |
| `src/app/(workspace)/tasks/[id]/page.tsx` | Add real-time SSE updates |
| `src/app/(workspace)/tasks/page.tsx` | Live refresh on new tasks |
| `src/app/(workspace)/sync/page.tsx` | Connect to real sync-queue |
| `src/app/api/internal/tasks/[id]/refresh/route.ts` | Wire to SSE instead of mock |
| `src/lib/auth.ts` | (already done) |
| `src/middleware.ts` | Add webhook route to bypass auth |
| `vercel.json` | Add cron config (optional) |
| `prisma/schema.prisma` | (already complete) |

---

## RunningHub API Protocol (confirmed)

**Base URL:** `https://www.runninghub.cn/openapi/v2`

**Submit Task:**
- `POST /run/ai-app/{webappId}`
- Auth: `Authorization: Bearer {API_KEY}`
- Response: `{ taskId, status, errorCode, errorMessage, results, clientId }`

**Query Task:**
- `POST /query`
- Body: `{ taskId }`
- Response: `{ taskId, status, results: [{ url, outputType }], errorCode, errorMessage }`

**Upload File:**
- `POST /media/upload/binary`
- Body: `FormData` with `file` field
- Response: `{ code, message, data: { type, download_url, fileName, size } }`

**Webhook:**
- RunningHub POSTs to `webhookUrl` on task completion
- Body: `{ event, eventData: { taskId, status, results, errorCode, errorMessage }, taskId }`

---

## Image Upload Flow

1. User selects images in form
2. Client sends images to `/api/internal/upload` (multipart)
3. Server POSTs to RunningHub `/media/upload/binary`
4. Server returns `download_url`
5. On form submit, `download_url` used as `fieldValue` in `nodeInfoList`

---

## Not In Scope

- User management UI (admin users page)
- App creation/editing UI
- Asset deletion or management
- Multiple RunningHub accounts
- Rate limiting / retry backoff
- Email/Slack notifications

---

## Test Plan

### Key Interactions to Verify
- Submit task → creates Prisma Task + Feishu record → returns taskId
- Upload image → returns download_url → can be used in nodeInfoList
- Webhook fires → task status updates → SSE pushes to client
- Poll fires → task status updates if webhook missed
- Task succeeds → assets created → Feishu updated

### Edge Cases
- Image upload fails → show error, don't submit task
- RunningHub returns FAILED immediately → update status + Feishu + show error
- Webhook arrives before /query response → both paths must not double-update
- Concurrent task submissions → respect TASK_MAX_CONCURRENCY
- Feishu API timeout → task should not fail, just log and retry

### Critical Paths
- Full flow: form submit → QUEUED → RUNNING → SUCCESS → Feishu updated
- Error flow: form submit → QUEUED → FAILED → Feishu updated with error
- Fallback flow: no webhook for 5+ min → cron picks up RUNNING tasks
