/**
 * Publish a rebuilt client bundle to the running DSH page(s).
 *
 * This is a diagnostic for an existing host watcher, not a guarantee that HMR
 * is enabled. It never reloads the Host module. Verify the installation target
 * and the running host's watcher before expecting automatic page updates.
 *
 * `node scripts/reload.mjs [--wait]`
 *
 * `--wait` subscribes to the event channel and reports the revision DSH
 * published, which doubles as a check that the host is actually watching this
 * bundle (and that the channel is reachable from here).
 */
import { statSync, utimesSync } from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { reloadTarget } from './lib/reload-target.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundle = join(root, 'client.js')
const pluginId = '@local/dsh-git-view'
const wait = process.argv.includes('--wait')
let endpoint
try {
  endpoint = reloadTarget(process.env.DSH_ORIGIN || process.env.DSH_WEB_URL)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

const before = statSync(bundle)
console.log(`bundle: ${bundle}`)
console.log(`  ${before.size} bytes, mtime ${before.mtime.toLocaleString()}`)

/** Read the revision the host published for this plugin, then stop listening. */
function watchPublished(ms) {
  return new Promise((resolve) => {
    const transport = endpoint.protocol === 'https:' ? https : http
    const request = transport.get(
      endpoint,
      { headers: { accept: 'text/event-stream' } },
      (response) => {
        if (response.statusCode !== 200) {
          console.log(`  event channel answered ${String(response.statusCode)}; cannot confirm`)
          request.destroy()
          resolve()
          return
        }
        let buffer = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          buffer += chunk
          const frames = buffer.split('\n\n')
          buffer = frames.pop() ?? ''
          for (const frame of frames) {
            const line = frame.trim()
            if (!line.startsWith('data:')) continue
            let parsed
            try {
              parsed = JSON.parse(line.slice(5).trim())
            } catch {
              continue
            }
            if (parsed.type === 'rebuilt' && parsed.id === pluginId) {
              console.log(`  rebuilt published: rev ${String(parsed.rev)}`)
              request.destroy()
              resolve()
              return
            }
            if (parsed.type === 'graph') {
              const row = (parsed.graph?.entries || []).find((entry) => entry.id === pluginId)
              if (row) console.log(`  graph row: rev ${String(row.rev)} · ${String(row.url)}`)
            }
          }
        })
      },
    )
    request.on('error', (error) => {
      console.log(`  event channel unreachable (${error.message}); touch still applied`)
      resolve()
    })
    setTimeout(() => {
      request.destroy()
      resolve()
    }, ms)
  })
}

const pending = wait ? watchPublished(4000) : Promise.resolve()

// Give the subscription a moment to attach before changing the file.
await new Promise((resolve) => setTimeout(resolve, wait ? 600 : 0))
const now = new Date()
utimesSync(bundle, now, now)
console.log(`touched at ${now.toLocaleTimeString()}; automatic updates require an active host watcher`)
await pending
