"use client"

import { useState } from "react"
import Link from "next/link"
import { maskCurrencyInput } from "@/lib/currency-input"
import { getPaymentMethodLabel } from "@/lib/payment-status"
import { buildTitlePaymentPayload } from "@/lib/title-payment-input"

type Titles = {
  customer: { creditBlocked: boolean; creditBlockedReason: string | null }
  openBalance: number
  receivables: Array<{ id: string; orderId: string; orderNumber: string | null; createdAt: string; originalAmount: number; paidAmount: number; openAmount: number; status: string; items: Array<{ quantity: number; productName: string; variantName: string | null }> }>
  payments: Array<{ id: string; amount: number; paymentMethod: "CASH" | "MANUAL_PIX" | "POS_DEBIT" | "POS_CREDIT"; reference: string | null; receivedAt: string; reversedAt: string | null; reversalReason: string | null; allocations: Array<{ amount: number; orderId: string; orderNumber: string | null }> }>
}

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

export default function CustomerDetailClient({ customer, canManageCredit }: { customer: { id: string; name: string; email: string | null; phone: string | null; active: boolean }; canManageCredit: boolean }) {
  const [tab, setTab] = useState<"cadastro" | "titulos">("cadastro")
  const [titles, setTitles] = useState<Titles | null>(null)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<Titles["payments"][number]["paymentMethod"]>("CASH")
  const [feedback, setFeedback] = useState<string | null>(null)

  async function loadTitles() {
    const response = await fetch(`/api/admin/customers/${customer.id}/titles`)
    if (response.ok) setTitles(await response.json())
  }

  async function registerPayment() {
    const response = await fetch(`/api/admin/customers/${customer.id}/titles/payments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildTitlePaymentPayload({ amount, paymentMethod: method, idempotencyKey: crypto.randomUUID() })),
    })
    const payload = await response.json()
    if (!response.ok) { setFeedback(payload.error ?? "Não foi possível registrar o recebimento."); return }
    setAmount(""); setFeedback("Recebimento registrado e distribuído nos títulos mais antigos."); void loadTitles()
  }

  async function setCreditBlocked(blocked: boolean) {
    const reason = blocked ? window.prompt("Motivo do bloqueio de fiado:") : null
    if (blocked && !reason?.trim()) return
    const response = await fetch(`/api/admin/customers/${customer.id}/credit-block`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocked, reason }) })
    const payload = await response.json()
    setFeedback(response.ok ? (blocked ? "Fiado bloqueado para novas vendas." : "Fiado liberado para novas vendas.") : payload.error ?? "Não foi possível atualizar o bloqueio.")
    if (response.ok) void loadTitles()
  }

  async function reversePayment(paymentId: string) {
    const reason = window.prompt("Motivo do estorno:")
    if (!reason?.trim()) return
    const response = await fetch(`/api/admin/customers/${customer.id}/titles/payments/${paymentId}/reverse`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) })
    const payload = await response.json()
    setFeedback(response.ok ? "Recebimento estornado e títulos reabertos." : payload.error ?? "Não foi possível estornar.")
    if (response.ok) void loadTitles()
  }

  return <div className="max-w-6xl space-y-6">
    <Link href="/admin/customers" className="text-sm text-gray-400 hover:text-white">← Clientes</Link>
    <div><h1 className="text-3xl font-heading uppercase tracking-wider">{customer.name}</h1><p className="mt-2 text-gray-400">{customer.phone ?? "Sem telefone"} · {customer.email ?? "Sem e-mail"}</p></div>
    <div className="flex gap-2 border-b border-white/10"><button onClick={() => setTab("cadastro")} className={`px-4 py-3 ${tab === "cadastro" ? "border-b-2 border-[var(--color-primary)] text-white" : "text-gray-400"}`}>Cadastro</button><button onClick={() => { setTab("titulos"); void loadTitles() }} className={`px-4 py-3 ${tab === "titulos" ? "border-b-2 border-[var(--color-primary)] text-white" : "text-gray-400"}`}>Títulos</button></div>
    {tab === "cadastro" ? <div className="rounded-sm border border-white/10 p-6 text-gray-300">Cliente {customer.active ? "ativo" : "inativo"}. Edite seus dados pela lista de clientes.</div> : <div className="space-y-6">
      <div className="rounded-sm border border-amber-500/30 bg-amber-500/10 p-5"><p className="text-sm text-amber-100">Saldo geral a pagar</p><p className="mt-2 text-3xl font-bold text-white">{money(titles?.openBalance ?? 0)}</p>{canManageCredit ? <button className="mt-3 rounded-sm border border-white/20 px-3 py-2 text-xs text-white" onClick={() => void setCreditBlocked(!titles?.customer.creditBlocked)}>{titles?.customer.creditBlocked ? "Liberar novas vendas Fiado" : "Bloquear novas vendas Fiado"}</button> : null}{titles?.customer.creditBlocked ? <p className="mt-2 text-sm text-red-200">Fiado bloqueado: {titles.customer.creditBlockedReason}</p> : null}</div>
      <div className="rounded-sm border border-white/10 p-5"><h2 className="font-heading uppercase">Registrar recebimento</h2><div className="mt-4 flex flex-wrap gap-3"><input className="input-admin max-w-44" inputMode="numeric" placeholder="R$ 0,00" value={amount} onChange={(event) => setAmount(maskCurrencyInput(event.target.value))} /><select className="input-admin max-w-52" value={method} onChange={(event) => setMethod(event.target.value as typeof method)}>{(["CASH", "MANUAL_PIX", "POS_DEBIT", "POS_CREDIT"] as const).map((item) => <option key={item} value={item}>{getPaymentMethodLabel(item)}</option>)}</select><button className="rounded-sm bg-[var(--color-primary)] px-4 py-2 font-bold text-black" onClick={registerPayment}>Registrar</button></div>{feedback ? <p className="mt-3 text-sm text-gray-300">{feedback}</p> : null}</div>
      <div className="overflow-x-auto rounded-sm border border-white/10"><table className="w-full text-left text-sm"><thead className="bg-white/5 text-gray-400"><tr><th className="p-3">Compra</th><th>Original</th><th>Pago</th><th>Saldo</th><th>Situação</th></tr></thead><tbody>{titles?.receivables.map((title) => <tr key={title.id} className="border-t border-white/5"><td className="p-3">{title.orderNumber ?? title.orderId}<div className="text-xs text-gray-500">{title.items.map((item) => `${item.quantity}× ${item.productName}`).join(", ")}</div></td><td>{money(title.originalAmount)}</td><td>{money(title.paidAmount)}</td><td>{money(title.openAmount)}</td><td>{title.status}</td></tr>)}</tbody></table></div>
      <div className="rounded-sm border border-white/10 p-5"><h2 className="font-heading uppercase">Histórico de recebimentos</h2><div className="mt-4 space-y-3">{titles?.payments.map((payment) => <div key={payment.id} className="border-t border-white/5 pt-3 text-sm"><span className="font-medium text-white">{money(payment.amount)} · {getPaymentMethodLabel(payment.paymentMethod)}</span><span className="ml-3 text-gray-500">{new Date(payment.receivedAt).toLocaleString("pt-BR")}</span>{payment.reversedAt ? <p className="mt-1 text-red-300">Estornado: {payment.reversalReason}</p> : canManageCredit ? <button className="ml-3 text-xs text-red-300 underline" onClick={() => void reversePayment(payment.id)}>Estornar</button> : null}</div>)}</div></div>
    </div>}
  </div>
}
