# Inbox (Bell) Implementation - Linear-style High-Signal Notification System

## Overview

Replaced follow-up-based inbox with a Linear-style notification system focused on **external signals that need attention**.

## Core Changes

### 1. Database Schema (`supabase/migrations/20260319_create_notifications.sql`)

Created `notifications` table with:
- `id` - UUID primary key
- `workspace_id` - Workspace reference
- `recipient_user_id` - User receiving notification
- `actor_user_id` - User who triggered notification
- `type` - Notification type (enum constraint)
- `entity_type` - order/comment/invitation
- `entity_id` - Referenced entity
- `order_id` - Order reference (if applicable)
- `metadata` - JSONB payload
- `is_read` - Read status
- `read_at` - Timestamp when read
- `created_at` - Creation timestamp

**Indexes:**
- `recipient_user_id` - Fast lookup by user
- `is_read` - Filter unread
- `created_at DESC` - Recent first
- `recipient_user_id, created_at DESC WHERE is_read = false` - Unread optimization

### 2. Notification Types

| Type | Trigger | Description |
|------|---------|-------------|
| `mention_received` | User tagged in comment | "@[user-id]" in comment body |
| `order_assigned` | Order assigned to user | First-time assignment |
| `order_reassigned` | Order reassigned | Assignment change |
| `important_comment_received` | Manager/owner comment | On user's managed order |
| `invitation_received` | Workspace invitation | Pending manager invite |

### 3. Notification Triggers

**Mention in Comments:**
- Parses `@[user-id]` format from comment body
- Creates notification for each mentioned user
- Skips self-mentions
- Verifies workspace access

**Order Assignment:**
- Fires on `orders.manager_id` update
- Distinguishes assigned vs reassigned
- Skips self-assignment

**Important Comments:**
- Manager/owner comments on user's orders
- Uses `order_comments` table
- Resolves author from phone number

**Invitations:**
- Fires on `business_invites` insert
- Only for PENDING status

### 4. API Endpoints

**GET /api/topbar/inbox**
```
Query params: businessId (required)
Returns: { ok: true, notifications: InboxNotification[] }
```

**POST /api/inbox/mark-read**
```json
{
  "notificationId": "uuid",  // Mark single notification
  "markAll": true            // Or mark all as read
}
```

**POST /api/inbox/seed-demo** (Development only)
```
Creates demo notifications for testing
```

### 5. UI Components

**InviteInbox.tsx** - Bell icon with dropdown
- Unread count badge (9+ overflow)
- "New" section (< 24 hours)
- "Earlier" section
- Compact list items (1-2 lines)
- Entire row clickable
- "Mark all as read" button

**Notification Item:**
- Line 1: Title ("You were mentioned in Order #28")
- Line 2: Preview (comment snippet, assigner name)
- Right: Timestamp ("5m ago", "2d ago")
- Unread: Blue background + dot indicator

**StartDayNudge.tsx** - Separate from Inbox
- Shows after Start Day if To do items exist
- Fixed position bottom-right
- Dismissible
- Links to /today page

## Key Design Decisions

### What Inbox IS:
- External signals requiring attention
- Personal notifications (tagged, assigned, commented)
- High-signal, low-noise

### What Inbox IS NOT:
- To do items (follow-ups remain in /today)
- Activity history (see Activity tab)
- Execution tasks

### Notification Rules:
1. **No self-notifications** - Don't notify about your own actions
2. **No duplicates** - 5-second deduplication window
3. **Workspace access check** - Only notify users with access
4. **Author exclusion** - Don't notify comment authors

## Testing Demo Data

### Create Demo Notifications

1. **Ensure you have:**
   - At least 6 orders in workspace
   - At least 2 users (for cross-user notifications)
   - Phone numbers set up (for order_comments compatibility)

2. **Call demo endpoint:**
   ```bash
   POST /api/inbox/seed-demo
   ```

3. **Expected results:**
   - Mention notification (Order #X)
   - Assigned notification (Order #Y)
   - Reassigned notification (Order #Z)
   - Important comment notification (Order #W)
   - 2 older notifications (for "Earlier" section)

### Manual Testing

**Test Mention:**
1. Open any order
2. Add comment: `@[user-id] please check this`
3. Switch to mentioned user
4. Check inbox - should see mention notification

**Test Assignment:**
1. Open order with different manager
2. Change manager to current user
3. Check inbox - should see assignment notification

**Test Important Comment:**
1. Assign order to user A
2. Log in as user B (manager/owner)
3. Add comment to order
4. Log in as user A
5. Check inbox - should see comment notification

## Validation Checklist

- [x] Inbox contains NO follow-ups
- [x] Inbox shows: mentions, assignments, comments, invitations
- [x] Demo data endpoint works
- [x] DB persistence (not frontend-only)
- [x] To do page unchanged (follow-ups still there)
- [x] Activity page unchanged
- [x] Unread count on bell
- [x] Click opens correct order
- [x] Click marks as read
- [x] "Mark all as read" works
- [x] Start Day nudge separate from Inbox

## Files Changed

### New Files:
- `supabase/migrations/20260319_create_notifications.sql`
- `src/app/api/inbox/mark-read/route.ts`
- `src/app/api/inbox/seed-demo/route.ts`
- `src/app/b/[slug]/_components/topbar/StartDayNudge.tsx`

### Modified Files:
- `src/app/api/topbar/inbox/route.ts` - Returns notifications (not follow-ups)
- `src/app/b/[slug]/_components/topbar/InviteInbox.tsx` - Linear-style UI
- `src/app/b/[slug]/today/page.tsx` - Added StartDayNudge

## Migration Required

Run in Supabase SQL Editor:
```sql
-- Apply notifications migration
-- File: supabase/migrations/20260319_create_notifications.sql
```

## Notes

- Uses `order_comments` table (legacy CRM table)
- Resolves user from phone number for compatibility
- Mention format: `@[uuid]` (e.g., `@[123e4567-e89b-12d3-a456-426614174000]`)
- Time formatting: "Just now", "5m ago", "2h ago", "3d ago", "Mar 15"
