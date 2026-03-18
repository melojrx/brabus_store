"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, LoaderCircle, MapPin, Save, UserRound } from "lucide-react"
import { formatPhone } from "@/lib/account"

type AccountProfile = {
  id: string
  name: string
  email: string
  phone: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressComplement: string | null
  addressNeighborhood: string | null
  addressCity: string | null
  addressState: string | null
  addressZip: string | null
}

type ProfileFormState = {
  name: string
  email: string
  phone: string
  addressStreet: string
  addressNumber: string
  addressComplement: string
  addressNeighborhood: string
  addressCity: string
  addressState: string
  addressZip: string
}

function buildInitialProfileForm(profile: AccountProfile): ProfileFormState {
  return {
    name: profile.name,
    email: profile.email,
    phone: formatPhone(profile.phone),
    addressStreet: profile.addressStreet ?? "",
    addressNumber: profile.addressNumber ?? "",
    addressComplement: profile.addressComplement ?? "",
    addressNeighborhood: profile.addressNeighborhood ?? "",
    addressCity: profile.addressCity ?? "",
    addressState: profile.addressState ?? "",
    addressZip: profile.addressZip ?? "",
  }
}

const inputCls =
  "w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-[var(--color-primary)]"

export default function AccountProfileClient({
  profile,
}: {
  profile: AccountProfile
}) {
  const router = useRouter()
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => buildInitialProfileForm(profile))
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [profileError, setProfileError] = useState("")
  const [profileSuccess, setProfileSuccess] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [isProfilePending, startProfileTransition] = useTransition()
  const [isPasswordPending, startPasswordTransition] = useTransition()

  function setProfileField(field: keyof ProfileFormState, value: string) {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function setPasswordField(field: "currentPassword" | "newPassword" | "confirmPassword", value: string) {
    setPasswordForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileError("")
    setProfileSuccess("")

    startProfileTransition(async () => {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        setProfileError(data.error || "Não foi possível salvar seu perfil.")
        return
      }

      setProfileSuccess("Dados atualizados com sucesso.")
      router.refresh()
    })
  }

  function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError("")
    setPasswordSuccess("")

    startPasswordTransition(async () => {
      const response = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        setPasswordError(data.error || "Não foi possível atualizar sua senha.")
        return
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      setPasswordSuccess("Senha atualizada com sucesso.")
    })
  }

  return (
    <div className="space-y-8">
      <section className="rounded-sm border border-white/5 bg-zinc-900 p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-[var(--color-primary)]/10 p-2.5 text-[var(--color-primary)]">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl uppercase tracking-wider text-white">Dados da Conta</h2>
            <p className="mt-1 text-sm text-gray-500">Nome, e-mail e telefone principal para contato e WhatsApp.</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="account-name" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Nome
              </label>
              <input
                id="account-name"
                className={inputCls}
                value={profileForm.name}
                onChange={(event) => setProfileField("name", event.target.value)}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="account-email" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                E-mail
              </label>
              <input
                id="account-email"
                className={inputCls}
                type="email"
                value={profileForm.email}
                onChange={(event) => setProfileField("email", event.target.value)}
                placeholder="voce@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="account-phone" className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Telefone / WhatsApp
            </label>
            <input
              id="account-phone"
              className={inputCls}
              value={profileForm.phone}
              onChange={(event) => setProfileField("phone", event.target.value)}
              placeholder="(85) 99999-9999"
            />
          </div>

          <div className="rounded-sm border border-white/5 bg-black/30 p-4">
            <div className="mb-4 flex items-center gap-2 text-white">
              <MapPin className="h-4 w-4 text-[var(--color-primary)]" />
              <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Endereço Principal</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <div className="space-y-2">
                <label htmlFor="account-address-street" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Rua
                </label>
                <input
                  id="account-address-street"
                  className={inputCls}
                  value={profileForm.addressStreet}
                  onChange={(event) => setProfileField("addressStreet", event.target.value)}
                  placeholder="Rua Antônio Lopes"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="account-address-number" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Número
                </label>
                <input
                  id="account-address-number"
                  className={inputCls}
                  value={profileForm.addressNumber}
                  onChange={(event) => setProfileField("addressNumber", event.target.value)}
                  placeholder="571"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="account-address-complement" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Complemento
                </label>
                <input
                  id="account-address-complement"
                  className={inputCls}
                  value={profileForm.addressComplement}
                  onChange={(event) => setProfileField("addressComplement", event.target.value)}
                  placeholder="Apto, bloco, referência"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="account-address-neighborhood" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Bairro
                </label>
                <input
                  id="account-address-neighborhood"
                  className={inputCls}
                  value={profileForm.addressNeighborhood}
                  onChange={(event) => setProfileField("addressNeighborhood", event.target.value)}
                  placeholder="Conjunto Cohab"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_120px_160px]">
              <div className="space-y-2">
                <label htmlFor="account-address-city" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Cidade
                </label>
                <input
                  id="account-address-city"
                  className={inputCls}
                  value={profileForm.addressCity}
                  onChange={(event) => setProfileField("addressCity", event.target.value)}
                  placeholder="Aracoiaba"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="account-address-state" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  UF
                </label>
                <input
                  id="account-address-state"
                  className={inputCls}
                  maxLength={2}
                  value={profileForm.addressState}
                  onChange={(event) => setProfileField("addressState", event.target.value.toUpperCase())}
                  placeholder="CE"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="account-address-zip" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  CEP
                </label>
                <input
                  id="account-address-zip"
                  className={inputCls}
                  value={profileForm.addressZip}
                  onChange={(event) => setProfileField("addressZip", event.target.value)}
                  placeholder="62765-000"
                />
              </div>
            </div>
          </div>

          {profileError ? <p className="text-sm text-red-400">{profileError}</p> : null}
          {profileSuccess ? <p className="text-sm text-emerald-400">{profileSuccess}</p> : null}

          <button
            type="submit"
            disabled={isProfilePending}
            className="inline-flex items-center gap-2 rounded-sm bg-[var(--color-primary)] px-6 py-3 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
          >
            {isProfilePending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Dados
          </button>
        </form>
      </section>

      <section className="rounded-sm border border-white/5 bg-zinc-900 p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-[var(--color-primary)]/10 p-2.5 text-[var(--color-primary)]">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl uppercase tracking-wider text-white">Segurança</h2>
            <p className="mt-1 text-sm text-gray-500">Atualize sua senha sem sair da conta.</p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="account-current-password" className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Senha Atual
            </label>
            <input
              id="account-current-password"
              className={inputCls}
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordField("currentPassword", event.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="account-new-password" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Nova Senha
              </label>
              <input
                id="account-new-password"
                className={inputCls}
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordField("newPassword", event.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="account-confirm-password" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Confirmar Nova Senha
              </label>
              <input
                id="account-confirm-password"
                className={inputCls}
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordField("confirmPassword", event.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          {passwordError ? <p className="text-sm text-red-400">{passwordError}</p> : null}
          {passwordSuccess ? <p className="text-sm text-emerald-400">{passwordSuccess}</p> : null}

          <button
            type="submit"
            disabled={isPasswordPending}
            className="inline-flex items-center gap-2 rounded-sm border border-[var(--color-primary)]/40 px-6 py-3 text-xs font-bold uppercase tracking-widest text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10 disabled:opacity-60"
          >
            {isPasswordPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Atualizar Senha
          </button>
        </form>
      </section>
    </div>
  )
}
