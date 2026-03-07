export const LeadSource = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  ADMIN: "ADMIN",
} as const

export type LeadSource = typeof LeadSource[keyof typeof LeadSource]

export const LeadStatus = {
  ACTIVE: "ACTIVE",
  FROZEN: "FROZEN",
  CLOSED: "CLOSED",
} as const

export type LeadStatus = typeof LeadStatus[keyof typeof LeadStatus]

export const LeadStage = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  QUALIFIED: "QUALIFIED",
  QUOTED: "QUOTED",
  ORDER_PLACED: "ORDER_PLACED",
  ORDER_COMPLETED: "ORDER_COMPLETED",
  DROPPED: "DROPPED",
  CLOSED: "CLOSED",
} as const

export type LeadStage = typeof LeadStage[keyof typeof LeadStage]

export interface StageChange {
  from: LeadStage
  to: LeadStage
  changedAt: string // ISO timestamp
  changedBy: string // userId
  changedByName?: string // User's name
}

export interface Lead {
  id: string
  funnelId: string
  channelId: string
  name: string
  email: string
  phone: string
  source: LeadSource
  status: LeadStatus
  stage: LeadStage
  assignedTo: string // memberId/userId
  assignedToName?: string // User's name
  notes?: string
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  stageHistory: StageChange[]
  contactHistory?: ContactRecord[]
}

export interface ContactRecord {
  id: string
  method: "CALL" | "EMAIL" | "MEETING" | "OTHER"
  response: "POSITIVE" | "NEGATIVE" | "NO_RESPONSE" | "PENDING"
  notes?: string
  recordedAt: string // ISO timestamp
  recordedBy: string // userId
  recordedByName?: string
}

export interface DashboardMetrics {
  totalLeads: number
  newLeadsThisWeek: number
  conversionRate: number
  activeChannels: number
  dealerCount: number
}

export interface WorkerMetrics {
  assignedLeads: number
  contactedThisWeek: number
  conversionRate: number
}

export interface DealerLeaderboardEntry {
  dealerId: string
  dealerName: string
  leadsBrought: number
  converted: number
  conversionRate: number
  estimatedRevenue?: number
}

export interface SalesPersonLeaderboardEntry {
  personId: string
  personName: string
  leadsAssigned: number
  converted: number
  conversionRate: number
}
