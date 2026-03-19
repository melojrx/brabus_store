"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import {
  formatChangeAmount,
  formatCurrencyInputValue,
  maskCurrencyInput,
  parseCurrencyInputValue,
} from "@/lib/currency-input"
import {
  ADMIN_ORDER_STATUS_OPTIONS,
  type OrderStatusValue,
  getOrderStatusMeta,
} from "@/lib/order-status"
import {
  PAYMENT_METHOD_VALUES,
  PAYMENT_STATUS_VALUES,
  type PaymentMethodValue,
  type PaymentStatusValue,
  getPaymentMethodLabel,
  getPaymentStatusMeta,
} from "@/lib/payment-status"

type Feedback =
  | {
      type: "success" | "error"
      message: string
    }
  | null

async function parseErrorMessage(response: Response) {
  try {
    const payload = await response.json()

    if (typeof payload?.error === "string") {
      return payload.error
    }
  } catch {
    return null
  }

  return null
}
function normalizeOptionalText(value: string) {
  return value.trim()
}

export default function OrderAdminActions({
  orderId,
  currentStatus,
  currentPaymentMethod,
  currentPaymentStatus,
  initialTrackingCode,
  initialManualPaymentReference,
  initialManualPaymentNotes,
  initialCashReceivedAmount,
  initialChangeAmount,
  initialPaymentInstallments,
  orderTotal,
  pixKey,
}: {
  orderId: string
  currentStatus: OrderStatusValue
  currentPaymentMethod: PaymentMethodValue
  currentPaymentStatus: PaymentStatusValue
  initialTrackingCode: string | null
  initialManualPaymentReference: string | null
  initialManualPaymentNotes: string | null
  initialCashReceivedAmount: number | null
  initialChangeAmount: number | null
  initialPaymentInstallments: number | null
  orderTotal: number
  pixKey: string | null
}) {
  const router = useRouter()
  const [status, setStatus] = useState<OrderStatusValue>(currentStatus)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>(currentPaymentMethod)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusValue>(currentPaymentStatus)
  const [trackingCode, setTrackingCode] = useState(initialTrackingCode ?? "")
  const [manualPaymentReference, setManualPaymentReference] = useState(initialManualPaymentReference ?? "")
  const [manualPaymentNotes, setManualPaymentNotes] = useState(initialManualPaymentNotes ?? "")
  const [cashReceivedAmount, setCashReceivedAmount] = useState(formatCurrencyInputValue(initialCashReceivedAmount))
  const [paymentInstallments, setPaymentInstallments] = useState(
    initialPaymentInstallments != null ? String(initialPaymentInstallments) : "1",
  )
  const [statusFeedback, setStatusFeedback] = useState<Feedback>(null)
  const [paymentFeedback, setPaymentFeedback] = useState<Feedback>(null)
  const [trackingFeedback, setTrackingFeedback] = useState<Feedback>(null)
  const [isStatusPending, startStatusTransition] = useTransition()
  const [isPaymentPending, startPaymentTransition] = useTransition()
  const [isTrackingPending, startTrackingTransition] = useTransition()

  useEffect(() => {
    setStatus(currentStatus)
  }, [currentStatus])

  useEffect(() => {
    setTrackingCode(initialTrackingCode ?? "")
  }, [initialTrackingCode])

  useEffect(() => {
    setPaymentMethod(currentPaymentMethod)
    setPaymentStatus(currentPaymentStatus)
    setManualPaymentReference(initialManualPaymentReference ?? "")
    setManualPaymentNotes(initialManualPaymentNotes ?? "")
    setCashReceivedAmount(formatCurrencyInputValue(initialCashReceivedAmount))
    setPaymentInstallments(initialPaymentInstallments != null ? String(initialPaymentInstallments) : "1")
  }, [
    currentPaymentMethod,
    currentPaymentStatus,
    initialManualPaymentReference,
    initialManualPaymentNotes,
    initialCashReceivedAmount,
    initialChangeAmount,
    initialPaymentInstallments,
  ])

  const normalizedInitialTrackingCode = useMemo(
    () => (initialTrackingCode ?? "").trim(),
    [initialTrackingCode],
  )
  const normalizedTrackingCode = trackingCode.trim()
  const normalizedInitialManualPaymentReference = useMemo(
    () => (initialManualPaymentReference ?? "").trim(),
    [initialManualPaymentReference],
  )
  const normalizedInitialManualPaymentNotes = useMemo(
    () => (initialManualPaymentNotes ?? "").trim(),
    [initialManualPaymentNotes],
  )
  const normalizedManualPaymentReference = normalizeOptionalText(manualPaymentReference)
  const normalizedManualPaymentNotes = normalizeOptionalText(manualPaymentNotes)
  const initialParsedCashReceivedAmount = useMemo(
    () => parseCurrencyInputValue(formatCurrencyInputValue(initialCashReceivedAmount)),
    [initialCashReceivedAmount],
  )
  const initialComputedChangeAmount = useMemo(
    () => formatChangeAmount(orderTotal, initialParsedCashReceivedAmount) ?? initialChangeAmount ?? 0,
    [initialChangeAmount, initialParsedCashReceivedAmount, orderTotal],
  )
  const normalizedInitialInstallments = useMemo(
    () => (initialPaymentInstallments != null ? String(initialPaymentInstallments) : "1"),
    [initialPaymentInstallments],
  )
  const parsedCashReceivedAmount = parseCurrencyInputValue(cashReceivedAmount)
  const computedChangeAmount = formatChangeAmount(orderTotal, parsedCashReceivedAmount)
  const currentStatusMeta = getOrderStatusMeta(status)
  const currentPaymentStatusMeta = getPaymentStatusMeta(paymentStatus)
  const isCashPayment = paymentMethod === "CASH"
  const isManualPixPayment = paymentMethod === "MANUAL_PIX"
  const isCardTerminalPayment = paymentMethod === "POS_DEBIT" || paymentMethod === "POS_CREDIT"
  const shouldShowPaymentReference = isManualPixPayment || isCardTerminalPayment
  const shouldShowPaymentNotes = isCashPayment || isManualPixPayment || isCardTerminalPayment
  const hasPaymentChanges =
    paymentMethod !== currentPaymentMethod ||
    paymentStatus !== currentPaymentStatus ||
    normalizedManualPaymentReference !== normalizedInitialManualPaymentReference ||
    normalizedManualPaymentNotes !== normalizedInitialManualPaymentNotes ||
    (isCashPayment ? parsedCashReceivedAmount ?? null : null) !== initialParsedCashReceivedAmount ||
    (isCashPayment ? computedChangeAmount ?? 0 : 0) !== initialComputedChangeAmount ||
    (isCardTerminalPayment && paymentMethod === "POS_CREDIT" ? paymentInstallments : "1") !== normalizedInitialInstallments

  function handleStatusSave() {
    startStatusTransition(async () => {
      setStatusFeedback(null)

      try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        })

        if (!response.ok) {
          const message = await parseErrorMessage(response)
          setStatusFeedback({
            type: "error",
            message: message ?? "Não foi possível atualizar o status do pedido.",
          })
          return
        }

        setStatusFeedback({
          type: "success",
          message: "Status atualizado com sucesso.",
        })
        router.refresh()
      } catch {
        setStatusFeedback({
          type: "error",
          message: "Erro de conexão ao atualizar o status.",
        })
      }
    })
  }

  function handlePaymentSave() {
    startPaymentTransition(async () => {
      setPaymentFeedback(null)

      try {
        const response = await fetch(`/api/admin/orders/${orderId}/payment`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentMethod,
            paymentStatus,
            paymentInstallments: paymentMethod === "POS_CREDIT" ? paymentInstallments : null,
            manualPaymentReference: shouldShowPaymentReference ? normalizedManualPaymentReference : null,
            manualPaymentNotes: shouldShowPaymentNotes ? normalizedManualPaymentNotes : null,
            cashReceivedAmount: isCashPayment && parsedCashReceivedAmount != null ? parsedCashReceivedAmount.toFixed(2) : null,
            changeAmount: null,
          }),
        })

        if (!response.ok) {
          const message = await parseErrorMessage(response)
          setPaymentFeedback({
            type: "error",
            message: message ?? "Não foi possível atualizar o pagamento do pedido.",
          })
          return
        }

        setPaymentFeedback({
          type: "success",
          message: "Pagamento atualizado com sucesso.",
        })
        router.refresh()
      } catch {
        setPaymentFeedback({
          type: "error",
          message: "Erro de conexão ao atualizar o pagamento.",
        })
      }
    })
  }

  function handleTrackingSave() {
    startTrackingTransition(async () => {
      setTrackingFeedback(null)

      try {
        const response = await fetch(`/api/admin/orders/${orderId}/tracking`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ trackingCode: normalizedTrackingCode }),
        })

        if (!response.ok) {
          const message = await parseErrorMessage(response)
          setTrackingFeedback({
            type: "error",
            message: message ?? "Não foi possível atualizar o rastreio do pedido.",
          })
          return
        }

        setTrackingFeedback({
          type: "success",
          message: normalizedTrackingCode
            ? "Código de rastreio salvo com sucesso."
            : "Código de rastreio removido com sucesso.",
        })
        router.refresh()
      } catch {
        setTrackingFeedback({
          type: "error",
          message: "Erro de conexão ao atualizar o rastreio.",
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-white/5 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-sm uppercase tracking-wider text-white">Pagamento</h2>
            <p className="mt-2 text-sm text-gray-500">
              Confirme pagamentos presenciais, registre Pix manual e mantenha observações úteis para operação.
            </p>
          </div>
          <span
            className={`rounded-sm px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] ${currentPaymentStatusMeta.outlinedClassName}`}
          >
            {currentPaymentStatusMeta.label}
          </span>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label-admin">Método de Pagamento</label>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PaymentMethodValue)}
                className="input-admin"
                disabled={isPaymentPending}
              >
                {PAYMENT_METHOD_VALUES.map((method) => (
                  <option key={method} value={method}>
                    {getPaymentMethodLabel(method)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-admin">Status do Pagamento</label>
              <select
                value={paymentStatus}
                onChange={(event) => setPaymentStatus(event.target.value as PaymentStatusValue)}
                className="input-admin"
                disabled={isPaymentPending}
              >
                {PAYMENT_STATUS_VALUES.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {getPaymentStatusMeta(statusOption).label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isManualPixPayment && pixKey && (
            <div className="rounded-sm border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-4 py-3 text-sm text-gray-200">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">Chave Pix da Loja</p>
              <p className="mt-2 break-all font-mono text-xs text-white">{pixKey}</p>
            </div>
          )}

          {shouldShowPaymentReference && (
            <div>
              <label className="label-admin">
                {isManualPixPayment ? "Referência do Pix" : "Referência da Operação"}
              </label>
              <input
                value={manualPaymentReference}
                onChange={(event) => setManualPaymentReference(event.target.value)}
                className="input-admin"
                placeholder={isManualPixPayment ? "Ex.: comprovante 9832 ou NSU" : "Ex.: NSU, autorização ou observação da maquineta"}
                disabled={isPaymentPending}
              />
            </div>
          )}

          {isCashPayment && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label-admin">Valor Recebido</label>
                <input
                  value={cashReceivedAmount}
                  onChange={(event) => setCashReceivedAmount(maskCurrencyInput(event.target.value))}
                  className="input-admin"
                  placeholder="R$ 0,00"
                  disabled={isPaymentPending}
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="label-admin">Troco Calculado</label>
                <input
                  value={formatCurrencyInputValue(computedChangeAmount)}
                  className="input-admin"
                  placeholder="R$ 0,00"
                  disabled
                  inputMode="numeric"
                />
              </div>
            </div>
          )}

          {paymentMethod === "POS_CREDIT" && (
            <div>
              <label className="label-admin">Parcelamento</label>
              <select
                value={paymentInstallments}
                onChange={(event) => setPaymentInstallments(event.target.value)}
                className="input-admin"
                disabled={isPaymentPending}
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((installment) => (
                  <option key={installment} value={String(installment)}>
                    {installment}x
                  </option>
                ))}
              </select>
            </div>
          )}

          {shouldShowPaymentNotes && (
            <div>
              <label className="label-admin">Observações</label>
              <textarea
                value={manualPaymentNotes}
                onChange={(event) => setManualPaymentNotes(event.target.value)}
                className="input-admin min-h-[120px] resize-y"
                placeholder={
                  isCardTerminalPayment
                    ? "Informações úteis da venda em maquineta, operadora ou conferência."
                    : "Informações úteis para caixa, conferência ou atendimento."
                }
                disabled={isPaymentPending}
              />
            </div>
          )}

          {paymentFeedback && (
            <p
              className={`rounded-sm border px-4 py-3 text-sm ${
                paymentFeedback.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {paymentFeedback.message}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePaymentSave}
              disabled={isPaymentPending || !hasPaymentChanges}
              className="inline-flex min-w-[240px] items-center justify-center gap-2 rounded-sm bg-[var(--color-primary)] px-6 py-3 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPaymentPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Salvar Pagamento
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-white/5 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-sm uppercase tracking-wider text-white">Status Operacional</h2>
            <p className="mt-2 text-sm text-gray-500">
              Atualize manualmente o andamento do pedido sem alterar pagamentos ou estoque.
            </p>
          </div>
          <span className={`rounded-sm px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] ${currentStatusMeta.outlinedClassName}`}>
            {currentStatusMeta.label}
          </span>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="label-admin">Status</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as OrderStatusValue)}
              className="input-admin"
              disabled={isStatusPending}
            >
              {ADMIN_ORDER_STATUS_OPTIONS.filter((option) => option.value !== "ALL").map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {statusFeedback && (
            <p
              className={`rounded-sm border px-4 py-3 text-sm ${
                statusFeedback.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {statusFeedback.message}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleStatusSave}
              disabled={isStatusPending || status === currentStatus}
              className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-sm bg-[var(--color-primary)] px-6 py-3 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isStatusPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Salvar Status
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-white/5 bg-zinc-900 p-6">
        <h2 className="font-heading text-sm uppercase tracking-wider text-white">Rastreamento</h2>
        <p className="mt-2 text-sm text-gray-500">
          Cadastre ou remova o código de rastreio usado na transportadora.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="label-admin">Código de Rastreio</label>
            <input
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value)}
              className="input-admin"
              placeholder="Ex.: BR123456789"
              disabled={isTrackingPending}
            />
          </div>

          {trackingFeedback && (
            <p
              className={`rounded-sm border px-4 py-3 text-sm ${
                trackingFeedback.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {trackingFeedback.message}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleTrackingSave}
              disabled={isTrackingPending || normalizedTrackingCode === normalizedInitialTrackingCode}
              className="inline-flex min-w-[240px] items-center justify-center gap-2 rounded-sm bg-[var(--color-primary)] px-6 py-3 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isTrackingPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Salvar Rastreio
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
