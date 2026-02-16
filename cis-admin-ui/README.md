# CIS Admin UI

## Progress Tracker

### Work Done (Current Session)

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

- Add query key constants per domain (`channels`, `members`, `permissions`, `funnels`)
- Move API + hooks into feature folders for cleaner module boundaries
- Replace remaining direct `alert/confirm` with reusable UI feedback components
- Add mutation error boundaries/toasts and optimistic update strategy where needed
- Add tests for:
  - auth/session bootstrap + logout scenarios
  - permission set update/create flows
  - channel create/deactivate flows
- Review backend session validation endpoint (`/internal/channels`) and switch to a dedicated `/auth/me` or `/auth/validate` endpoint when available