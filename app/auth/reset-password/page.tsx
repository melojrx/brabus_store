"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { KeyRound, LoaderCircle } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    startTransition(async () => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(data.error || "Não foi possível redefinir a senha.")
        return
      }

      router.push("/auth/login?reset=1")
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
          <p className="text-gray-400 mt-2 text-sm uppercase tracking-widest">Definir nova senha</p>
        </div>

        <div className="glass p-8 rounded-sm border border-white/10">
          <h2 className="text-2xl font-heading tracking-wider uppercase mb-4 text-center">Redefinir Senha</h2>
          <p className="text-sm text-center text-gray-400 mb-8">
            Crie uma nova senha para voltar a acessar sua conta.
          </p>

          {!token ? (
            <div className="rounded-sm border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              Link inválido. Solicite uma nova recuperação de senha.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Nova Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full bg-black/50 border border-white/10 rounded-sm p-4 text-white placeholder-gray-600 focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full bg-black/50 border border-white/10 rounded-sm p-4 text-white placeholder-gray-600 focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                />
              </div>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
                Salvar Nova Senha
              </button>
            </form>
          )}

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
