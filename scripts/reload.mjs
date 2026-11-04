/**
 * Publish a rebuilt client bundle to the running DSH page(s).
 *
 * DSH's `client-hmr` plugin stat-polls every client bundle (500ms) and
 * broadcasts a `rebuilt` frame on `/plugins/events` when a bundle's
 * mtime/ctime/size changes; the page then reloads that plugin without a manual
 * refresh. So after `pnpm build`, touching `client.js` is enough to make the
 * open panel pick up the new code.
 *
 * `node scripts/reload.mjs [--wait]`
 *
 * `--wait` subscribes to the event channel and reports the revision DSH
 * published, which doubles as a check that the host is actually watching this
 * bundle (and that the channel is reachable from here).
 */
import { statSync, utimesSync } from 'node:fs'
import http from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundle = join(root, 'client.js')
const pluginId = '@local/dsh-git-view'
const wait = process.argv.includes('--wait')
const origin = (process.env.DSH_ORIGIN || process.env.DSH_WEB_URL || 'http://127.0.0.1:50537').replace(/\/$/, '')

const before = statSync(bundle)
console.log(`bundle: ${bundle}`)
console.log(`  ${before.size} bytes, mtime ${before.mtime.toLocaleString()}`)

/** Read the revision the host published for this plugin, then stop listening. */
function watchPublished(ms) {
  return new Promise((resolve) => {
    const request = http.get(
      `${origin}/plugins/events`,
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
console.log(`touched at ${now.toLocaleTimeString()}; DSH polls every 500ms`)
await pending
