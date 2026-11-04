/**
 * Screenshot every fixture in both themes with headless Chrome.
 *
 * `node scripts/preview.mjs`            -> the gallery, dark + light
 * `node scripts/preview.mjs "Toolbar"`  -> one fixture
 *
 * Output: build/preview/<theme>-<case>.png (+ the HTML next to it).
 */
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chrome, loadFixtures, outDir, renderFixture, renderPage } from './preview-lib.mjs'

if (!chrome) {
  console.error('No Chrome/Edge found; cannot screenshot.')
  process.exit(1)
}

const fixtures = await loadFixtures()
await mkdir(outDir, { recursive: true })

const wanted = process.argv.slice(2)
const cases = wanted.length
  ? fixtures.ALL_CASES.filter((item) => wanted.some((name) => name.toLowerCase() === item.name.toLowerCase()))
  : [{ name: 'Gallery', element: fixtures.GALLERY }]

if (cases.length === 0) {
  console.error(`No such case. Available: ${fixtures.ALL_CASES.map((item) => item.name).join(', ')}`)
  process.exit(1)
}

for (const theme of ['dark', 'light']) {
  for (const item of cases) {
    const html = renderPage(theme, renderFixture(item.element))
    const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const file = join(outDir, `${theme}-${slug}.html`)
    await writeFile(file, html, 'utf8')
    const png = join(outDir, `${theme}-${slug}.png`)
    execFileSync(
      chrome,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        `--screenshot=${png}`,
        '--window-size=1560,6400',
        '--virtual-time-budget=1500',
        file,
      ],
      { stdio: 'ignore' },
    )
    console.log(png)
  }
}
