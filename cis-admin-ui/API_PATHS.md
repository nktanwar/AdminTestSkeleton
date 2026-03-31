# API Paths

This document lists the API paths currently used by the frontend.

Source of truth: [src/lib/api.ts](/home/nk/Projects/Test/allisonTest/cis-admin-ui/src/lib/api.ts)

## Base routing

- Default app base URL: `/internal`
- Auth and user endpoints are also called with their own explicit prefixes (`/auth`, `/api`)

## Channels

| Helper | Method | Path |
| --- | --- | --- |
| `ChannelAPI.list` | `GET` | `/internal/channels` |
| `ChannelAPI.create` | `POST` | `/internal/channels` |
| `ChannelAPI.deactivate` | `POST` | `/internal/channels/{id}/deactivate` |
| `ChannelAPI.get` | `GET` | `/internal/channels/{id}` |
| `ChannelAPI.me` | `GET` | `/internal/channels/{channelId}/me` |

## Dashboard

| Helper | Method | Path |
| --- | --- | --- |
| `DashboardAPI.get` | `GET` | `/internal/channels/{channelId}/dashboard` |

## Auth

| Helper | Method | Path |
| --- | --- | --- |
| `AuthAPI.login` | `POST` | `/auth/login` |
| `AuthAPI.selectMembership` | `POST` | `/auth/select-membership` |
| `AuthAPI.validateSession` | `GET` | `/internal/channels` |

## Channel Members

| Helper | Method | Path |
| --- | --- | --- |
| `ChannelMemberAPI.list` | `GET` | `/internal/channels/{channelId}/members` |
| `ChannelMemberAPI.addMember` | `POST` | `/internal/channels/{channelId}/members/addMember` |
| `ChannelMemberAPI.assignPermissionSet` | `PUT` | `/internal/channels/{channelId}/members/{memberId}/permission-set` |

## Users

| Helper | Method | Path |
| --- | --- | --- |
| `UserAPI.list` | `GET` | `/api/users` |

## Permissions

| Helper | Method | Path |
| --- | --- | --- |
| `PermissionAPI.listPermissions` | `GET` | `/internal/permissions/atoms` |
| `PermissionAPI.listSets` | `GET` | `/internal/channels/{channelId}/permission-sets` |
| `PermissionAPI.createSet` | `POST` | `/internal/channels/{channelId}/permission-sets` |
| `PermissionAPI.updateSet` | `PUT` | `/internal/channels/{channelId}/permission-sets/{id}` |
| `PermissionAPI.deleteSet` | `DELETE` | `/internal/channels/{channelId}/permission-sets/{id}` |

## Funnels

| Helper | Method | Path |
| --- | --- | --- |
| `FunnelAPI.list` | `GET` | `/internal/channels/{channelId}/funnels` |
| `FunnelAPI.create` | `POST` | `/internal/channels/{channelId}/funnels` |
| `FunnelAPI.get` | `GET` | `/internal/channels/{channelId}/funnels/{id}` |

## Leads

| Helper | Method | Path |
| --- | --- | --- |
| `LeadAPI.myLeads` | `GET` | `/internal/channels/{channelId}/leads/my-leads` |
| `LeadAPI.list` | `GET` | `/internal/channels/{channelId}/leads/funnel/{funnelId}` |
| `LeadAPI.create` | `POST` | `/internal/channels/{channelId}/leads` |
| `LeadAPI.assign` | `POST` | `/internal/channels/{channelId}/leads/assign` |
| `LeadAPI.moveStage` | `POST` | `/internal/channels/{channelId}/leads/moveStage` |
