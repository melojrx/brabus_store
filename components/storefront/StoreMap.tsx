"use client"

import React, { useEffect, useRef, useState } from "react"
import location from "@/docs/brand/store-location-map.json"
import { brandAssets } from "@/lib/brand-assets"

export default function StoreMap() {
  const container = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let disposed = false
    let map: import("leaflet").Map | undefined
    let observer: ResizeObserver | undefined
    async function initialize() {
      try {
        const L = await import("leaflet")
        if (disposed || !container.current) return
        const point: [number, number] = [location.latitude, location.longitude]
        map = L.map(container.current, { scrollWheelZoom: false, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView(point, 17)
        L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)
        L.marker(point, {
          icon: L.icon({ iconUrl: brandAssets.emblem.src, iconSize: [76, 76], iconAnchor: [38, 76], popupAnchor: [0, -76], className: "brabus-map-marker" }),
          alt: "Localização da Brabu’s Performance Store",
          title: "Brabu’s Performance Store",
        }).addTo(map).bindPopup("Brabu’s Performance Store · Rua Antônio Lopes, 571")
        observer = new ResizeObserver(() => map?.invalidateSize())
        observer.observe(container.current)
      } catch {
        if (!disposed) setFailed(true)
      }
    }
    void initialize()
    return () => { disposed = true; observer?.disconnect(); map?.remove() }
  }, [])
  return <div className="storefront-map-wrapper"><div ref={container} className="storefront-interactive-map" role="region" aria-label="Localização da Brabu’s Performance Store" />{failed && <p className="storefront-map-error">Não foi possível carregar o mapa. Use o botão Abrir no Google Maps.</p>}</div>
}
