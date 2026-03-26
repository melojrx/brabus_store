"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { DashboardPeriod, DashboardTab } from "@/lib/admin-dashboard"

type PeriodOption = {
  value: DashboardPeriod
  shortLabel: string
}

export default function DashboardPeriodPicker({
  currentPeriod,
  currentTab,
  options,
}: {
  currentPeriod: DashboardPeriod
  currentTab: DashboardTab
  options: ReadonlyArray<PeriodOption>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function handleChange(nextPeriod: DashboardPeriod) {
    const params = new URLSearchParams(searchParams.toString())

    if (nextPeriod === "30d") {
      params.delete("period")
    } else {
      params.set("period", nextPeriod)
    }

    if (currentTab === "overview") {
      params.delete("page")
    }

    const query = params.toString()

    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname)
    })
  }

  return (
    <div className="relative">
      <select
        value={currentPeriod}
        onChange={(event) => handleChange(event.target.value as DashboardPeriod)}
        aria-label="Selecionar período da dashboard"
        disabled={isPending}
        className="h-11 min-w-[180px] appearance-none rounded-sm border border-[var(--color-primary)] bg-black px-4 pr-10 text-sm font-bold text-white outline-none transition-colors hover:border-[var(--color-primary-dark)] focus:border-[var(--color-primary)] disabled:cursor-wait disabled:opacity-70"
      >
        {options.map((periodOption) => (
          <option key={periodOption.value} value={periodOption.value}>
            {periodOption.shortLabel}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--color-primary)]">
        <span className="text-xs">{isPending ? "..." : "▼"}</span>
      </div>
    </div>
  )
}
