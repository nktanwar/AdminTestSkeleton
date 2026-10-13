export interface AdminDealerAnalyticsSummary {
  totalDealers: number
  totalCustomers: number
  totalOrders: number
  ordersByState: Record<string, number>
  ordersByPaymentStatus: Record<string, number>
  ordersWithPricingSnapshot: number
  totalDealerCost: number
  totalCustomerAmount: number
  totalDealerProfit: number
}

export interface AdminDealerAnalyticsItem {
  dealerId: string
  dealerName: string
  email: string
  phone?: string | null
  channelIds: string[]
  totalCustomers: number
  totalOrders: number
  ordersByState: Record<string, number>
  ordersByPaymentStatus: Record<string, number>
  ordersWithPricingSnapshot: number
  totalDealerCost: number
  totalCustomerAmount: number
  totalDealerProfit: number
}

export interface AdminDealerAnalyticsPagination {
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface AdminDealerAnalyticsResponse {
  summary: AdminDealerAnalyticsSummary
  dealers: AdminDealerAnalyticsItem[]
  pagination: AdminDealerAnalyticsPagination
}

export interface AdminDealerAnalyticsParams {
  channelId?: string
  dealerId?: string
  orderState?: string
  paymentStatus?: string
  from?: string
  to?: string
  page?: number
  size?: number
}

export interface AdminDealerOrderItem {
  productId: string
  name?: string | null
  sku?: string | null
  quantity: number
  color?: string[] | null
  description?: string | null
  categoryId?: string | null
  imageUrl?: string | null
  price?: number | null
  metaData?: Record<string, unknown> | null
  configuration?: {
    configurationId?: string | null
    version?: number | null
    answers?: Array<Record<string, unknown>>
  } | null
}

export interface AdminDealerOrderDetail {
  orderId: string
  createdAt?: string | null
  updatedAt?: string | null
  customerId?: string | null
  customerName?: string | null
  customerPhoneNumber?: string | null
  customerEmail?: string | null
  customerAddress?: {
    street?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    landmark?: string | null
    country?: string | null
  } | null
  customer?: {
    id?: string | null
    name?: string | null
    phone?: string | null
    email?: string | null
    address?: {
      street?: string | null
      city?: string | null
      state?: string | null
      zipCode?: string | null
      landmark?: string | null
      country?: string | null
    } | null
  } | null
  dealerId?: string | null
  dealerName?: string | null
  dealerPhone?: string | null
  dealerEmail?: string | null
  dealer?: {
    id?: string | null
    name?: string | null
    phone?: string | null
    email?: string | null
  } | null
  channelId?: string | null
  channelName?: string | null
  items?: AdminDealerOrderItem[]
  orderState: string
  paymentMethod?: string | null
  paymentStatus?: string | null
  pricing?: {
    hasSnapshot: boolean
    pricingChannelId?: string | null
    items?: Array<Record<string, unknown>>
    totalDealerCost?: number | null
    originalCustomerTotal?: number | null
    discountPercent?: number | null
    discountAmount?: number | null
    finalCustomerTotal?: number | null
    dealerProfit?: number | null
  } | null
  [key: string]: unknown
}

export interface AdminDealerOrdersDetailResponse {
  orders: AdminDealerOrderDetail[]
  pagination: AdminDealerAnalyticsPagination
}

export interface AdminDealerOrdersPageResponse {
  content: AdminDealerOrderDetail[]
  number: number
  size: number
  totalElements: number
  totalPages: number
}
