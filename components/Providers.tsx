"use client"

import { SessionProvider } from "next-auth/react"
import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useCartStore } from "@/store/cartStore"

function CartSessionSync() {
  const { data: session, status } = useSession()
  const syncCartOwner = useCartStore((state) => state.syncCartOwner)

  useEffect(() => {
    if (status === "loading") {
      return
    }

    syncCartOwner(session?.user?.id ?? null)
  }, [session?.user?.id, status, syncCartOwner])

  return null
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartSessionSync />
      {children}
    </SessionProvider>
  )
}
