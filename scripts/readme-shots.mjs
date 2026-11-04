/**
 * Render the README screenshots from the real component fixtures.
 *
 * The committed `docs/images/panel-{light,dark}.png` are real screenshots of the
 * panel running inside DSH; this script is the fallback for when a live capture
 * is unavailable. `node scripts/readme-shots.mjs` writes both files
 * (1560x780, device scale 1) from the fixtures, so the images still match the
 * shipped panel and never expose a real workspace — but running it overwrites
 * the committed captures.
 */
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chrome, loadFixtures, outDir, renderFixture, renderPage } from './preview-lib.mjs'

const pluginRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const images = join(pluginRoot, 'docs', 'images')

if (!chrome) {
  console.error('No Chrome/Edge found; cannot render README screenshots.')
  process.exit(1)
}

const fixtures = await loadFixtures()
const panel = fixtures.ALL_CASES.find((item) => item.name === 'Full panel')
if (!panel) {
  console.error('Missing "Full panel" fixture.')
  process.exit(1)
}

await mkdir(outDir, { recursive: true })
await mkdir(images, { recursive: true })

for (const theme of ['light', 'dark']) {
  const html = renderPage(theme, renderFixture(panel.element))
  const file = join(outDir, `readme-${theme}.html`)
  await writeFile(file, html, 'utf8')
  const png = join(images, `panel-${theme}.png`)
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1560,780',
      '--virtual-time-budget=2000',
      `--screenshot=${png}`,
      file,
    ],
    { stdio: 'ignore' },
  )
  console.log(png)
}
