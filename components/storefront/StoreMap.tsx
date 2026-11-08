"use client"

import React, { useEffect, useRef, useState } from "react"
import location from "@/docs/brand/store-location-map.json"
import { brandAssets } from "@/lib/brand-assets"

const mapStyle = "https://tiles.openfreemap.org/styles/dark"

export default function StoreMap() {
  const container = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let disposed = false
    let map: import("maplibre-gl").Map | undefined
    let observer: ResizeObserver | undefined
    async function initialize() {
      try {
        const GL = await import("maplibre-gl")
        if (disposed || !container.current) return
        GL.setWorkerUrl("/map-engine/maplibre-gl-worker.mjs")
        const point: [number, number] = [location.longitude, location.latitude]
        map = new GL.Map({ container: container.current, style: mapStyle, center: point, zoom: 16.5, dragRotate: false, pitchWithRotate: false, fadeDuration: 0 })
        map.on("style.load", () => {
          if (!map || disposed) return
          map.setPaintProperty("background", "background-color", "#242827")
          for (const layer of map.getStyle().layers) {
            if (layer.type === "symbol" && layer.layout?.["text-field"]) {
              map.setPaintProperty(layer.id, "text-color", "#B8B8B8")
              map.setPaintProperty(layer.id, "text-halo-color", "#242827")
              map.setPaintProperty(layer.id, "text-halo-width", 1.2)
            }
            if (layer.type === "line" && layer.id.startsWith("highway_")) {
              map.setPaintProperty(layer.id, "line-color", layer.id.includes("casing") ? "#292D2F" : "#4A5254")
            }
            if (layer.id === "building") map.setPaintProperty(layer.id, "fill-color", "#303534")
            if (layer.id === "landuse_residential") map.setPaintProperty(layer.id, "fill-color", "#242827")
          }
        })
        map.scrollZoom.disable()
        map.touchZoomRotate.disableRotation()
        map.addControl(new GL.NavigationControl({ showCompass: false }), "top-left")
        const pin = document.createElement("div")
        pin.className = "brabus-map-marker brabus-map-pin"
        pin.style.width = "76px"
        pin.style.height = "94px"
        pin.setAttribute("aria-label", "Brabu’s Performance Store")
        const head = document.createElement("span")
        head.className = "brabus-map-pin-head"
        const emblem = document.createElement("img")
        emblem.src = brandAssets.emblem.src
        emblem.alt = ""
        head.append(emblem)
        pin.append(head)
        new GL.Marker({ element: pin, anchor: "bottom" }).setLngLat(point).setPopup(new GL.Popup({ offset: 86 }).setText("Brabu’s Performance Store · Rua Antônio Lopes, 571")).addTo(map)
        map.on("movestart", () => { if (container.current) container.current.dataset.mapLoaded = "false" })
        map.on("idle", () => {
          if (!disposed && container.current && map?.areTilesLoaded()) {
            container.current.dataset.mapLoaded = "true"
            setFailed(false)
          }
        })
        map.on("error", () => { if (!disposed) setFailed(true) })
        observer = new ResizeObserver(() => map?.resize())
        observer.observe(container.current)
      } catch {
        if (!disposed) setFailed(true)
      }
    }
    void initialize()
    return () => { disposed = true; observer?.disconnect(); map?.remove() }
  }, [])
  return <div className="storefront-map-wrapper"><div ref={container} className="storefront-interactive-map" data-map-style={mapStyle} role="region" aria-label="Localização da Brabu’s Performance Store" />{failed && <p className="storefront-map-error">Não foi possível carregar o mapa. Use o botão Abrir no Google Maps.</p>}</div>
}
