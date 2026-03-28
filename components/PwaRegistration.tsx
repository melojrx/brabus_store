"use client"

import { useEffect } from "react"

export default function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return
    }

    if (!("serviceWorker" in navigator)) {
      return
    }

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.error("Falha ao registrar o service worker do PWA.", error)
    })
  }, [])

  return null
}
