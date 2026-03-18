"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { Mail, LoaderCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [resetUrl, setResetUrl] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSuccess("")
    setResetUrl("")

    startTransition(async () => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = (await response.json()) as {
        error?: string
        message?: string
        resetUrl?: string
      }

      if (!response.ok) {
        setError(data.error || "Não foi possível iniciar a recuperação de senha.")
        return
      }

      setSuccess(data.message || "Se existir uma conta com este e-mail, enviaremos um link de recuperação.")
      setResetUrl(data.resetUrl || "")
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-heading tracking-wider uppercase text-white">
              Brabu&apos;s <span className="text-[var(--color-primary)]">Store</span>
            </h1>
          </Link>
          <p className="text-gray-400 mt-2 text-sm uppercase tracking-widest">Recuperar acesso</p>
        </div>

        <div className="glass p-8 rounded-sm border border-white/10">
          <h2 className="text-2xl font-heading tracking-wider uppercase mb-4 text-center">Esqueci Minha Senha</h2>
          <p className="text-sm text-center text-gray-400 mb-8">
            Informe o e-mail da conta para gerar um link seguro de redefinição.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full bg-black/50 border border-white/10 rounded-sm p-4 text-white placeholder-gray-600 focus:border-[var(--color-primary)] focus:outline-none transition-colors"
              />
            </div>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
            {resetUrl ? (
              <div className="rounded-sm border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 p-4 text-sm text-gray-200">
                <p className="font-bold uppercase tracking-widest text-[10px] text-[var(--color-primary)]">Ambiente de Desenvolvimento</p>
                <a href={resetUrl} className="mt-2 block break-all text-white underline underline-offset-4">
                  {resetUrl}
                </a>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPending ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
              Solicitar Link
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-sm text-[var(--color-primary)] hover:underline font-bold">
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
