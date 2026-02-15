# Pass System Administration Guide

## Overview

The Pass System is a **speakeasy-style access gate** that allows the site owner (you) to create time-limited access codes for portfolio visitors. Visitors enter a code at `/door` to receive a guest JWT token, which grants them entry to the game world and access to auth-gated buildings.

### Use Cases
- **Portfolio showcases:** Generate codes for recruiters, clients, or colleagues
- **Controlled access:** Limit who can explore your world without public sign-up
- **Analytics:** Track which codes are used and when
- **Time-bound demos:** Create passes that expire after a presentation or event

### Architecture
- **Frontend:** `/door` scene validates code, `/dashboard/pass-manager` for admin
- **Backend:** Express.js API with MongoDB storage, Auth0 JWT signing
- **Security:** Passes are single-use or revocable, JWTs expire with pass expiration

---

## Dashboard Access

### Pass Manager URL
```
https://platform.thisisvillegas.com/dashboard/pass-manager
```

**Authentication Required:** Auth0 login (owner account only)

### Features
- ✅ Create new passes with custom labels and expiration dates
- ✅ View all active and expired passes
- ✅ Revoke passes immediately (logs out active visitors)
- ✅ Track pass usage (when used, guest account ID)
- ✅ Auto-cleanup of expired passes

---

## Creating Passes

### Via Dashboard UI

1. Navigate to `/dashboard/pass-manager`
2. Fill out **Create New Pass** form:
   - **Label:** Descriptive name (e.g., "Recruiter Demo - TechCorp")
   - **Expiration Date:** When the pass expires (up to 1 year)
   - **Notes (optional):** Internal notes (e.g., "Sent to Jane Doe on 2026-02-14")
3. Click **Create Pass**
4. Copy the generated `accessCode` (e.g., `ALPHA-BRAVO-123456`)
5. Share the code with the visitor

### API Endpoint

```http
POST /api/passes/create
Authorization: Bearer {auth0-jwt}
Content-Type: application/json

{
  "label": "Recruiter Demo - TechCorp",
  "expiresAt": "2026-03-14T23:59:59Z",
  "notes": "Shared with Jane Doe via email"
}
```

**Response:**
```json
{
  "success": true,
  "pass": {
    "id": "65f3a8b9c1d4e2f3g4h5i6j7",
    "accessCode": "ALPHA-BRAVO-123456",
    "label": "Recruiter Demo - TechCorp",
    "createdAt": "2026-02-14T10:30:00Z",
    "expiresAt": "2026-03-14T23:59:59Z",
    "used": false,
    "usedAt": null,
    "revokedAt": null
  }
}
```

### Access Code Format

- **Pattern:** `WORD-WORD-NUMBERS` (e.g., `ALPHA-BRAVO-123456`)
- **Word dictionary:** NATO phonetic alphabet (Alpha, Bravo, Charlie, etc.)
- **Numbers:** 6 random digits
- **Uniqueness:** Guaranteed unique per pass
- **Case-insensitive:** Visitors can enter lowercase

---

## Pass Lifecycle

### 1. Created
- Pass generated with unique access code
- Status: `used: false`, `revokedAt: null`
- Visible in Pass Manager dashboard

### 2. Used
- Visitor enters code at `/door` and validates successfully
- Backend creates guest account with matching `passId`
- Pass updated: `used: true`, `usedAt: {timestamp}`, `usedBy: {guestId}`
- Guest JWT issued with expiration matching pass expiration

### 3. Expired
- Pass reaches `expiresAt` date
- No longer valid for new use
- Existing guest JWTs become invalid
- Marked for cleanup (deleted by nightly cron)

### 4. Revoked
- Owner clicks **Revoke** in Pass Manager
- Pass updated: `revokedAt: {timestamp}`
- Associated guest account deleted immediately
- Active visitor logged out (JWT invalidated)
- Marked for cleanup (deleted by nightly cron)

---

## Guest Account Provisioning

### Auto-Creation on Pass Validation

When a visitor validates a pass, the backend automatically creates a **Guest Account**:

```typescript
interface GuestAccount {
  id: string;              // Unique guest ID
  passId: string;          // Reference to the pass used
  email: string;           // Auto-generated (e.g., "guest-abc123@temporary")
  createdAt: Date;         // When the pass was validated
  expiresAt: Date;         // Matches pass expiration
  lastActiveAt: Date;      // Updated on API calls with guest JWT
}
```

### Guest JWT Claims

```json
{
  "sub": "guest|65f3a8b9c1d4e2f3g4h5i6j7",
  "email": "guest-abc123@temporary",
  "role": "guest",
  "passId": "65f3a8b9c1d4e2f3g4h5i6j7",
  "exp": 1710451199
}
```

### Guest Permissions

**Allowed:**
- ✅ Enter game world (`/world`)
- ✅ Interact with NPCs, collect fragments, unlock achievements
- ✅ Enter **auth-gated buildings** (e.g., Tactiqal, Rootine)
- ✅ Save progress to backend (collectibles, achievements persist)

**Not Allowed:**
- ❌ Access Pass Manager (`/dashboard/pass-manager`) - owner only
- ❌ Access World Manager (`/dashboard/world-manager`) - owner only
- ❌ Create or revoke passes
- ❌ Modify world theme settings

### Guest Session Storage

- **JWT:** Stored in `localStorage` as `guest_token`
- **Expiration:** Checked on every API request with guest JWT
- **Logout:** Deleting `guest_token` from localStorage logs out
- **Auto-logout:** JWT expiration triggers redirect to `/door`

---

## Revoking Passes

### Via Dashboard UI

1. Navigate to `/dashboard/pass-manager`
2. Find the pass in the **Active Passes** list
3. Click **Revoke** button
4. Confirm revocation in modal
5. Pass immediately invalidated, guest logged out

### API Endpoint

```http
DELETE /api/passes/:passId
Authorization: Bearer {auth0-jwt}
```

**Response:**
```json
{
  "success": true,
  "message": "Pass revoked successfully"
}
```

### What Happens

1. Pass updated: `revokedAt: {now}`
2. Associated guest account deleted from database
3. Guest JWT becomes invalid (backend rejects on next API call)
4. Visitor redirected to `/door` with "Access revoked" message
5. Pass marked for cleanup (deleted by nightly cron)

---

## Monitoring & Analytics

### Pass Usage Tracking

**Dashboard View:**
- Total passes created
- Active passes (not expired, not revoked)
- Used passes (visitor has entered with this code)
- Expired passes (past expiration date)

**Per-Pass Metrics:**
- `createdAt` - When the pass was generated
- `usedAt` - When the visitor first validated the code
- `usedBy` - Guest account ID (links to visitor progress)
- `expiresAt` - Expiration timestamp
- `revokedAt` - Revocation timestamp (if revoked)

### Visitor Activity (Future)

**Planned Features:**
- Last seen timestamp (`lastActiveAt` on guest account)
- Buildings visited (tracked in `VisitorProgress` model)
- Collectibles found (tracked in `VisitorProgress`)
- Achievements unlocked (tracked in `VisitorProgress`)
- Time spent in world (tracked in `VisitorProgress`)

**Dashboard View (Future):**
```
┌─────────────────────────────────────────────────────────┐
│ Pass: Recruiter Demo - TechCorp (ALPHA-BRAVO-123456)   │
├─────────────────────────────────────────────────────────┤
│ Created: 2026-02-14 10:30 AM                            │
│ Used: 2026-02-14 11:15 AM                               │
│ Expires: 2026-03-14 11:59 PM                            │
│                                                          │
│ Visitor Activity:                                       │
│  • Last seen: 2026-02-14 2:45 PM                        │
│  • Time spent: 1h 30m                                   │
│  • Buildings visited: 5/10                              │
│  • Collectibles: 8/15                                   │
│  • Achievements: 3/9                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Backend API Endpoints

### Public Endpoints (No Auth Required)

#### Validate Pass
```http
POST /api/passes/validate
Content-Type: application/json

{
  "accessCode": "ALPHA-BRAVO-123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-03-14T23:59:59Z"
}
```

**Error Responses:**
- `400` - Missing or invalid access code format
- `404` - Pass not found
- `410` - Pass expired or revoked

### Protected Endpoints (Auth0 JWT Required)

#### Create Pass
```http
POST /api/passes/create
Authorization: Bearer {auth0-jwt}
Content-Type: application/json

{
  "label": "Demo Pass",
  "expiresAt": "2026-03-14T23:59:59Z",
  "notes": "Optional notes"
}
```

#### List All Passes
```http
GET /api/passes
Authorization: Bearer {auth0-jwt}
```

**Response:**
```json
{
  "success": true,
  "passes": [
    {
      "id": "...",
      "accessCode": "ALPHA-BRAVO-123456",
      "label": "Demo Pass",
      "createdAt": "...",
      "expiresAt": "...",
      "used": true,
      "usedAt": "...",
      "usedBy": "guest|...",
      "revokedAt": null
    }
  ]
}
```

#### Revoke Pass
```http
DELETE /api/passes/:passId
Authorization: Bearer {auth0-jwt}
```

### Guest JWT Endpoints

#### Save Visitor Progress
```http
POST /api/world/progress
Authorization: Bearer {guest-jwt}
Content-Type: application/json

{
  "collectibles": ["player-movement", "dialogue-branching"],
  "achievements": ["first_steps", "curious_explorer"],
  "buildingsVisited": ["projects-building", "dashboard-building"],
  "npcsInteracted": ["claude-npc-01"],
  "dialogueCount": 5,
  "timeSpent": 900,
  "lastPosition": { "x": 400, "y": 300 }
}
```

#### Load Visitor Progress
```http
GET /api/world/progress
Authorization: Bearer {guest-jwt}
```

---

## Database Schema

### Pass Model

```typescript
interface Pass {
  _id: ObjectId;
  accessCode: string;      // Unique access code (indexed)
  label: string;           // Descriptive label for admin
  createdAt: Date;         // When pass was created
  expiresAt: Date;         // Expiration timestamp
  used: boolean;           // Whether pass has been used
  usedAt: Date | null;     // When pass was first validated
  usedBy: string | null;   // Guest account ID (if used)
  revokedAt: Date | null;  // Revocation timestamp (if revoked)
  notes: string | null;    // Optional admin notes
}
```

**Indexes:**
- `accessCode` (unique) - Fast validation lookups
- `expiresAt` (TTL) - Auto-delete expired docs (optional)
- `used` - Filter active/used passes in dashboard

### Guest Model

```typescript
interface Guest {
  _id: ObjectId;
  passId: ObjectId;        // Reference to Pass
  email: string;           // Auto-generated email
  createdAt: Date;         // Account creation timestamp
  expiresAt: Date;         // Matches pass expiration
  lastActiveAt: Date;      // Updated on API calls
}
```

**Indexes:**
- `passId` (unique) - One guest per pass
- `expiresAt` (TTL) - Auto-delete expired guests (optional)

### VisitorProgress Model (Phase 8)

```typescript
interface VisitorProgress {
  _id: ObjectId;
  guestId: ObjectId;       // Reference to Guest
  collectibles: string[];  // Array of collectible IDs
  achievements: string[];  // Array of achievement IDs
  buildingsVisited: string[];
  npcsInteracted: string[];
  dialogueCount: number;
  timeSpent: number;       // Seconds spent in world
  lastPosition: { x: number; y: number };
  updatedAt: Date;
}
```

**Indexes:**
- `guestId` (unique) - One progress doc per guest

---

## Security Considerations

### JWT Signing
- **Algorithm:** HS256 (HMAC with SHA-256)
- **Secret:** Loaded from environment variable `JWT_SECRET`
- **Expiration:** Matches pass `expiresAt` (enforced on every request)
- **Claims:** `sub`, `email`, `role`, `passId`, `exp`

### Rate Limiting (Planned)
- **Endpoint:** `/api/passes/validate`
- **Limit:** 5 attempts per IP per minute
- **Purpose:** Prevent brute-force code guessing

### Access Code Security
- **Entropy:** ~42 bits (2 words × 26 alphabet + 6 digits × 10)
- **Uniqueness:** Guaranteed via database unique constraint
- **Expiration:** All passes have finite lifespan
- **Revocation:** Owner can invalidate at any time

### Guest Isolation
- **No cross-guest data:** Guests cannot access other guest progress
- **JWT verification:** Every API call validates JWT signature and expiration
- **Role-based access:** Guest role cannot access owner-only endpoints

---

## Cleanup Automation

### Nightly Cron Job

**Script:** `backend/scripts/cleanup-expired.ts`

**Runs:** Daily at 2:00 AM (configurable via cron)

**Actions:**
1. Delete expired passes (`expiresAt < now`)
2. Delete revoked passes (`revokedAt != null`)
3. Delete expired guest accounts (`expiresAt < now`)
4. Log counts of deleted records

**Command:**
```bash
cd /home/remus/apps/platform/backend
node dist/scripts/cleanup-expired.js
```

**Cron Entry:**
```cron
0 2 * * * cd /home/remus/apps/platform/backend && node dist/scripts/cleanup-expired.js >> /var/log/platform-cleanup.log 2>&1
```

### Manual Cleanup

Run cleanup script manually:
```bash
ssh remus@192.168.0.95
cd /home/remus/apps/platform/backend
npm run cleanup:expired
```

---

## Common Admin Tasks

### Task: Share a pass with a visitor

1. Create pass in Pass Manager
2. Copy access code (e.g., `ALPHA-BRAVO-123456`)
3. Send to visitor via email/Slack/etc.
4. Instruct visitor to visit `https://platform.thisisvillegas.com/door`
5. Visitor enters code, clicks "Enter"
6. On success, visitor redirected to `/world`

### Task: Check if a visitor has used their pass

1. Navigate to `/dashboard/pass-manager`
2. Find pass by label
3. Check "Used" column:
   - ✅ Green badge = Used
   - ⏳ Yellow badge = Not used yet
4. Click pass row to see `usedAt` timestamp and `usedBy` guest ID

### Task: Revoke access for a visitor

1. Navigate to `/dashboard/pass-manager`
2. Find pass by label
3. Click **Revoke** button
4. Confirm revocation
5. Visitor immediately logged out, cannot re-enter

### Task: Extend a pass expiration

**Current:** Not supported via UI

**Workaround:**
1. Create a new pass with extended expiration
2. Revoke old pass
3. Share new access code with visitor

**Future:** Add "Extend Expiration" button in Pass Manager

### Task: View visitor analytics

**Current:** Not fully implemented (Phase 8 in progress)

**Available Now:**
- Pass usage timestamps (`usedAt`)
- Guest account ID (`usedBy`)

**Coming Soon:**
- Buildings visited
- Collectibles found
- Achievements unlocked
- Time spent in world

---

## Troubleshooting

### Problem: Visitor says "Invalid access code"

**Possible Causes:**
1. Code was mistyped (case-insensitive, but hyphens required)
2. Pass expired (check `expiresAt` in dashboard)
3. Pass revoked (check `revokedAt` in dashboard)
4. Database connection issue (check backend logs)

**Solution:**
- Verify code is correct (copy-paste to avoid typos)
- Check pass status in dashboard
- Create new pass if needed

### Problem: Visitor logged out unexpectedly

**Possible Causes:**
1. Pass was revoked by owner
2. JWT expired (matches pass `expiresAt`)
3. Guest account was deleted manually
4. Browser cleared `localStorage`

**Solution:**
- Check if pass is still active in dashboard
- Create new pass if original expired/revoked

### Problem: Dashboard shows wrong pass count

**Possible Causes:**
1. Expired passes not cleaned up yet (runs nightly)
2. Browser cache stale (hard refresh)

**Solution:**
- Run cleanup script manually
- Hard refresh dashboard (Ctrl+Shift+R)

---

## Future Enhancements

- **Multi-use passes:** Allow same code to be used by multiple visitors (limited count)
- **Pass templates:** Predefined expiration durations (1 day, 1 week, 1 month)
- **Email invites:** Auto-send access codes via email from dashboard
- **Analytics dashboard:** Visitor engagement metrics and heatmaps
- **Webhooks:** Notify external systems when pass is used or expires
- **Guest messaging:** Send in-game messages to active visitors
- **Pass groups:** Organize passes by campaign or event
