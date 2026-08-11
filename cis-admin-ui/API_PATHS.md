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

## Product Service

| Helper | Method | Path |
| --- | --- | --- |
| `ProductAPI.listDealerProducts` | `GET` | `/public/dealer/products` |
| `ProductAPI.getDealerProduct` | `GET` | `/public/dealer/products/{productId}` |
| `ProductAPI.getConfiguration` | `GET` | `/public/cis/products/{productId}/configurations/{configurationId}` |
| `ProductAPI.validateConfiguration` | `POST` | `/public/cis/products/configurations/validate` |
| `ProductAPI.verifyProduct` | `POST` | `/public/cis/products/verify` |
| `ProductAPI.verifyProductOption` | `POST` | `/public/cis/products/configurations/options/verify` |

Base URL: `process.env.NEXT_PUBLIC_PRODUCT_API`

## CIS Base URL

Base URL: `process.env.NEXT_PUBLIC_API_URL`

## Dealer Pricing And Checkout

| Helper | Method | Path |
| --- | --- | --- |
| `DealerAPI.listChannelPricing` | `GET` | `/api/dealer/channels/{channelId}/pricing` |
| `DealerAPI.getChannelProductPricing` | `GET` | `/api/dealer/channels/{channelId}/pricing/products/{productId}` |
| `DealerAPI.getChannelProductConfigurationPricing` | `GET` | `/api/dealer/channels/{channelId}/pricing/products/{productId}/configurations/{configurationId}` |
| `DealerAPI.checkout` | `POST` | `/api/dealer/channels/{channelId}/checkout` |

## Admin Channel Pricing

| Helper | Method | Path |
| --- | --- | --- |
| `CISAPI.listProductPricing` | `GET` | `/api/admin/channels/{channelId}/pricing/products` |
| `CISAPI.updateProductPricing` | `PUT` | `/api/admin/channels/{channelId}/pricing/products` |
| `CISAPI.listOptionPricing` | `GET` | `/api/admin/channels/{channelId}/pricing/products/{productId}/configurations/{configurationId}` |
| `CISAPI.updateOptionPricing` | `PUT` | `/api/admin/channels/{channelId}/pricing/options` |

The admin pricing table loads all products from `ProductAPI.listDealerProducts`, then merges configured prices from `CISAPI.listProductPricing`.
