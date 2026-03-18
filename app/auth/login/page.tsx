"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Email ou senha inválidos. Verifique e tente novamente.")
      setLoading(false)
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        {/* Logo / Marca */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-heading tracking-wider uppercase text-white">
              Brabu&apos;s <span className="text-[var(--color-primary)]">Store</span>
            </h1>
          </Link>
          <p className="text-gray-400 mt-2 text-sm uppercase tracking-widest">Acesse sua conta</p>
        </div>

        {/* Card de Login */}
        <div className="glass p-8 rounded-sm border border-white/10">
          <h2 className="text-2xl font-heading tracking-wider uppercase mb-8 text-center">Entrar</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-sm flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-black/50 border border-white/10 rounded-sm p-4 text-white placeholder-gray-600 focus:border-[var(--color-primary)] focus:outline-none transition-colors pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <LogIn className="w-5 h-5" />
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-gray-400 text-sm">
              Não tem conta?{" "}
              <Link href="/auth/register" className="text-[var(--color-primary)] hover:underline font-bold">
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
