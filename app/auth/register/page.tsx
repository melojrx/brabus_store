"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { UserPlus, AlertCircle } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar conta")
      }

      router.push("/auth/login?registered=1")
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
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
          <p className="text-gray-400 mt-2 text-sm uppercase tracking-widest">Crie sua conta</p>
        </div>

        <div className="glass p-8 rounded-sm border border-white/10">
          <h2 className="text-2xl font-heading tracking-wider uppercase mb-8 text-center">Criar Conta</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-sm flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Nome Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Seu nome"
                className="w-full bg-black/50 border border-white/10 rounded-sm p-4 text-white placeholder-gray-600 focus:border-[var(--color-primary)] focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full bg-black/50 border border-white/10 rounded-sm p-4 text-white placeholder-gray-600 focus:border-[var(--color-primary)] focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Senha (mín. 6 caracteres)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full bg-black/50 border border-white/10 rounded-sm p-4 text-white placeholder-gray-600 focus:border-[var(--color-primary)] focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <UserPlus className="w-5 h-5" />
              {loading ? "Criando conta..." : "Criar Conta"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Já tem conta?{" "}
              <Link href="/auth/login" className="text-[var(--color-primary)] hover:underline font-bold">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
