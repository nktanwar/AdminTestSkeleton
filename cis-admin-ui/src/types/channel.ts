export interface Channel {
  id: string
  name: string
  code: string
  status: "ACTIVE" | "INACTIVE"

  // Optional fields (used in View page)
  walletEnabled?: boolean
  knowledgeCenterAccess?: boolean
  createdAt?: string
  updatedAt?: string | null
}
