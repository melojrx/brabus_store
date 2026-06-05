export type MercadoPagoPaymentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "in_process"
  | "in_mediation"
  | "charged_back"
  | "partial_refunded"

export type MercadoPagoPaymentType =
  | "credit_card"
  | "debit_card"
  | "pix"
  | "ticket"
  | "account_money"

export interface MercadoPagoPayment {
  id: string
  status: MercadoPagoPaymentStatus
  status_detail: string
  payment_type_id: MercadoPagoPaymentType
  date_created: string
  date_approved: string | null
  date_last_updated: string
  external_reference: string | null
  transaction_amount: number
  transaction_amount_refunded: number
  description: string | null
  collector_id: number
  payer: {
    id: string
    email: string
    identification: {
      type: string
      number: string
    }
  }
  metadata: Record<string, unknown>
}

export interface MercadoPagoWebhookPayload {
  topic: string
  id: string
  action: string
  date_created: string
  api_version: string
  data: {
    id: string
  }
}

export interface MercadoPagoPixQrCode {
  qr_code: string
  qr_code_base64: string | null
  point_of_interface: string
}

export interface MercadoPagoPreference {
  id: string
  init_point: string
  sandbox_init_point: string
}

export interface MercadoPagoCreatePreferenceRequest {
  items: Array<{
    id: string
    title: string
    description?: string
    picture_url?: string
    category_id?: string
    quantity: number
    currency_id: string
    unit_price: number
  }>
  external_reference?: string
  metadata?: Record<string, unknown>
  payment_methods?: {
    excluded_payment_types?: Array<{ id: string }>
    installments?: number
  }
  back_urls?: {
    success: string
    failure: string
    pending: string
  }
  notification_url?: string
  auto_return?: "approved" | "pending"
}

export interface MercadoPagoCreatePreferenceResponse {
  id: string
  init_point: string
  sandbox_init_point: string
  date_created: string
  init_point_in_point_of_interface?: string
}
