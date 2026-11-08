import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import vm from "node:vm"
import test from "node:test"
import manifest from "../app/manifest"

test("installed icon URLs are versioned and PNG dimensions match the manifest", () => {
  for (const icon of manifest().icons ?? []) {
    assert.match(icon.src, /brabus-g10/)
    const buffer = readFileSync(`public${icon.src}`)
    assert.equal(buffer.subarray(1, 4).toString(), "PNG")
    assert.equal(`${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`, icon.sizes)
  }
  for (const size of [16, 32, 180]) assert.ok(existsSync(`public/brand/icons/brabus-g10-${size}.png`))
  const layout = readFileSync("app/layout.tsx", "utf8")
  assert.match(layout, /brabus-g10-16\.png/)
  assert.match(layout, /brabus-g10-32\.png/)
  assert.match(layout, /brabus-g10-180\.png/)
})

test("service worker installs new icons and removes previous brand cache only", async () => {
  const listeners: Record<string, (event: { waitUntil(promise: Promise<unknown>): void }) => void> = {}
  const removed: string[] = []
  const installed: string[] = []
  let opened = ""
  let claimed = false
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: { addEventListener: (name: string, fn: typeof listeners[string]) => { listeners[name] = fn }, skipWaiting: async () => {}, clients: { claim: async () => { claimed = true } } },
    caches: { open: async (name: string) => { opened = name; return { addAll: async (paths: string[]) => { installed.push(...paths) } } }, keys: async () => ["brabus-store-pwa-v1", "brabus-store-pwa-g10", "unrelated-cache"], delete: async (key: string) => { removed.push(key) } },
  })
  let pending: Promise<unknown> = Promise.resolve()
  const event = { waitUntil: (p: Promise<unknown>) => { pending = p } }
  listeners.install(event)
  await pending
  assert.equal(opened, "brabus-store-pwa-g10")
  for (const icon of manifest().icons ?? []) assert.ok(installed.includes(icon.src))
  listeners.activate(event)
  await pending
  assert.deepEqual(removed, ["brabus-store-pwa-v1"])
  assert.ok(claimed)
})
