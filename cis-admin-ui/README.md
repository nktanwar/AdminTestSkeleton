# CIS Admin UI

## Progress Tracker

### Work Done (Current Session)

- Implemented Lead Module integration in funnel view:
  - Lead list table with columns: customer, phone, owner, stage, status, creator, created at
  - Client-side filters: stage, status, owner, search by name, search by phone
  - Manual lead creation via `POST /lead/{channelId}/create`
  - Bulk assignment via `POST /lead/{channelId}/assign`
  - Empty state messaging for no leads and no filter results
- Added dedicated lead detail page:
  - Route: `/channels/:channelId/funnels/:id/leads/:leadId`
  - Customer and lead metadata sections
  - Stage history timeline
  - Events timeline with transfer-friendly rendering
- Extended API layer with Lead contracts:
  - `LeadAPI.list(channelId, funnelId)`
  - `LeadAPI.create(channelId, payload)`
  - `LeadAPI.assign(channelId, payload)`

- Added centralized auth architecture:
  - `AuthProvider` + `useAuth`
  - `ProtectedRoute` + dedicated `/login` route flow
- Enforced session rules:
  - logout if token missing/expired
  - logout if backend session validation fails (including API down)
  - logout on API `401`
- Added React Query foundation:
  - installed `@tanstack/react-query`
  - added shared `QueryClient` + provider in `main.tsx`
- Migrated pages from manual `useEffect` fetch state to query/mutation state:
  - `PermissionSets`
  - `Channels`
  - `Members`
  - `ChannelLayout`
  - `Dashboard`
  - `FunnelView`
- Fixed `FunnelView` type issue by typing `FunnelAPI.getUi` as `api<FunnelUi>(...)`
- Verified build passes after migration

### Why This Refactor Was Done

- Standardized server-state handling across CRM pages
- Removed duplicated fetch/loading/error boilerplate
- Improved auth correctness on refresh, token expiry, and backend outage
- Made future feature work safer and easier to scale

### Next Session TODO

 - 1 Leads view and my leads fix 

- Add query key constants per domain (`channels`, `members`, `permissions`, `funnels`)
- Move API + hooks into feature folders for cleaner module boundaries
- Replace remaining direct `alert/confirm` with reusable UI feedback components
- Add mutation error boundaries/toasts and optimistic update strategy where needed
- Add tests for:
  - auth/session bootstrap + logout scenarios
  - permission set update/create flows
  - channel create/deactivate flows
- Review backend session validation endpoint (`/internal/channels`) and switch to a dedicated `/auth/me` or `/auth/validate` endpoint when available
