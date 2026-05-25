"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { KeyRound, Loader2 } from "lucide-react"

export default function ChangePasswordPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não conferem.")
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || "Erro ao alterar senha.")
        return
      }

      const result = await signIn("credentials", {
        email: session?.user?.email ?? "",
        password: newPassword,
        redirect: false,
      })

      if (result?.error) {
        router.push("/auth/login?message=password-changed")
        return
      }

      router.push("/admin")
      router.refresh()
    } catch {
      setError("Erro de conexão.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-sm border border-white/5 bg-zinc-900 p-8">
        <div className="flex items-center gap-3 mb-6">
          <KeyRound className="w-7 h-7 text-[var(--color-primary)]" />
          <h1 className="text-2xl font-heading tracking-wider uppercase">Alterar Senha</h1>
        </div>

        <p className="text-gray-400 text-sm mb-6">
          Sua senha é temporária. Por segurança, defina uma nova senha antes de continuar.
        </p>

        {error && (
          <div className="mb-4 rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-admin">Nova Senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-admin"
              placeholder="Mínimo 6 caracteres"
              autoFocus
            />
          </div>
          <div>
            <label className="label-admin">Confirmar Senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-admin"
              placeholder="Repita a nova senha"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-[var(--color-primary)] px-4 py-3 text-sm font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Definir Nova Senha
          </button>
        </form>
      </div>
    </div>
  )
}
