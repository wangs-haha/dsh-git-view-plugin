/**
 * Design audit for the rendered panel: resolves the real computed styles in
 * headless Chrome and reports, per theme,
 *
 * - WCAG contrast for every piece of visible text (with the composited
 *   background it actually sits on),
 * - resolved values of the plugin's own color tokens,
 * - geometry of the layout landmarks (header/row/control heights),
 * - elements whose content overflows its box.
 *
 * `node scripts/audit.mjs [--json]`
 *
 * This is how the plugin's palette is verified without a human eyeballing
 * screenshots: the numbers come from the browser, not from the stylesheet.
 */
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chrome, loadFixtures, outDir, renderFixture, renderPage } from './preview-lib.mjs'

if (!chrome) {
  console.error('No Chrome/Edge found; cannot audit.')
  process.exit(1)
}

/** Injected into the page; writes one base64 JSON blob into #audit-out. */
const AUDIT_SCRIPT = String.raw`
(() => {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const parse = (value) => {
    if (!value) return null
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = '#000000'
    context.fillStyle = String(value)
    context.fillRect(0, 0, 1, 1)
    const data = context.getImageData(0, 0, 1, 1).data
    return { r: data[0], g: data[1], b: data[2], a: data[3] / 255 }
  }
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  })
  const hex = (color) =>
    '#' +
    [color.r, color.g, color.b].map((part) => Math.round(part).toString(16).padStart(2, '0')).join('') +
    (color.a !== undefined && color.a < 0.999 ? '@' + color.a.toFixed(2) : '')
  const luminance = (color) => {
    const channel = (value) => {
      const scaled = value / 255
      return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
  }
  const ratio = (a, b) => {
    const la = luminance(a)
    const lb = luminance(b)
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
  }
  const themeDark = document.body.hasAttribute('data-ds-dark-theme')
  const pageBg = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }

  const backgroundOf = (element) => {
    const chain = []
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) chain.push(node)
    let result = { ...pageBg, a: 1 }
    for (let index = chain.length - 1; index >= 0; index -= 1) {
      const color = parse(getComputedStyle(chain[index]).backgroundColor)
      if (color && color.a > 0) result = over(color, result)
    }
    return result
  }

  const label = (element) => {
    const classes = (element.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.')
    return classes || element.tagName.toLowerCase()
  }

  const contrast = []
  const iconContrast = []
  let iconsChecked = 0
  const geometry = []
  const overflow = []

  document.querySelectorAll('.shot').forEach((shot) => {
    const shotName = (shot.querySelector('h2') || {}).textContent || 'shot'

    shot.querySelectorAll('*').forEach((element) => {
      const own = Array.from(element.childNodes)
        .filter((node) => node.nodeType === 3)
        .map((node) => node.textContent.trim())
        .join(' ')
      if (!own) return
      const style = getComputedStyle(element)
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) < 0.2) return
      const rect = element.getBoundingClientRect()
      if (rect.width < 4 || rect.height < 4) return
      const fg = parse(style.color)
      if (!fg) return
      const bg = backgroundOf(element)
      const size = parseFloat(style.fontSize)
      const weight = Number(style.fontWeight) || 400
      const large = size >= 18.66 || (size >= 14 && weight >= 700)
      const value = ratio(over({ ...fg, a: fg.a ?? 1 }, bg), bg)
      const threshold = large ? 3 : 4.5
      if (value < threshold) {
        contrast.push({
          shot: shotName,
          element: label(element),
          text: own.slice(0, 42),
          size: Number(size.toFixed(1)),
          weight,
          color: hex(fg),
          background: hex(bg),
          ratio: Number(value.toFixed(2)),
          threshold,
        })
      }
    })

    const iconSelectors = [
      '.gv-icon-button svg',
      '.gv-head-icon svg',
      '.gv-chevron svg',
      '.gv-change-discard svg',
      '.gv-change-resolve svg',
      '.gv-row-more svg',
      '.gv-dropdown-trigger svg',
      '.gv-split-grip i',
    ].join(',')
    shot.querySelectorAll(iconSelectors).forEach((element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      if (style.visibility === 'hidden' || style.display === 'none') return
      if (rect.width < 3 || rect.height < 3) return
      if (element.closest('button:disabled, [aria-disabled="true"]')) return
      let opacity = 1
      for (let node = element; node && node !== shot; node = node.parentElement) {
        opacity *= Number(getComputedStyle(node).opacity) || 1
      }
      if (opacity < 0.2) return
      const bg = backgroundOf(element.parentElement || element)
      const color = element.tagName.toLowerCase() === 'i' ? parse(style.backgroundColor) : parse(style.color)
      if (!color || (color.a ?? 1) === 0) return
      iconsChecked += 1
      const value = ratio(over({ ...color, a: color.a ?? 1 }, bg), bg)
      if (value < 3) {
        iconContrast.push({
          shot: shotName,
          element: label(element.parentElement || element),
          color: hex(color),
          background: hex(bg),
          ratio: Number(value.toFixed(2)),
        })
      }
    })

    const landmarks = [
      '.gv-toolbar',
      '.gv-brand',
      '.gv-changes',
      '.gv-changes-list',
      '.gv-commit',
      '.gv-left',
      '.gv-changes-head',
      '.gv-tree-head',
      '.gv-details-head',
      '.gv-scopebar',
      '.gv-thead',
      '.gv-row',
      '.gv-change-row',
      '.gv-tree-row',
      '.gv-statusbar',
      '.gv-icon-button',
      '.gv-button',
      '.gv-dropdown-trigger',
      '.gv-search-input',
      '.gv-commit-input',
      '.gv-commit-submit',
      '.gv-remote',
      '.gv-sum-chip',
    ]
    landmarks.forEach((selector) => {
      const element = shot.querySelector(selector)
      if (!element) return
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      geometry.push({
        shot: shotName,
        selector,
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        font: style.fontSize,
        radius: style.borderRadius,
        bg: hex(backgroundOf(element)),
        color: hex(parse(style.color) || pageBg),
        border: style.borderTopColor,
      })
    })

    shot.querySelectorAll('[class*="gv-"]').forEach((element) => {
      const style = getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden') return
      const horizontal = element.scrollWidth - element.clientWidth
      const vertical = element.scrollHeight - element.clientHeight
      if (horizontal > 2 && style.overflowX !== 'visible' && !style.textOverflow.includes('ellipsis')) {
        overflow.push({ shot: shotName, element: label(element), parent: label(element.parentElement), by: horizontal, axis: 'x' })
      }
      if (vertical > 2 && style.overflowY === 'hidden') {
        overflow.push({ shot: shotName, element: label(element), parent: label(element.parentElement), by: vertical, axis: 'y' })
      }
    })

    shot.querySelectorAll('[class*="gv-"]').forEach((element) => {
      const rect = element.getBoundingClientRect()
      if (rect.width < 4 || rect.height < 4) return
      for (let parent = element.parentElement; parent && parent !== shot; parent = parent.parentElement) {
        const style = getComputedStyle(parent)
        if (style.overflowX !== 'hidden' && style.overflowX !== 'clip') continue
        const bounds = parent.getBoundingClientRect()
        const over = Math.round(Math.max(rect.right - bounds.right, bounds.left - rect.left))
        if (over > 2) {
          overflow.push({ shot: shotName, element: label(element), parent: label(parent), by: over, axis: 'bleed' })
        }
        break
      }
    })
  })

  const tokens = {}
  const tokenNames = Array.from(
    new Set(
      Array.from(document.styleSheets)
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules)
          } catch {
            return []
          }
        })
        .flatMap((rule) => {
          const text = rule.cssText || ''
          return text.match(/--gv-[a-z0-9-]+/g) || []
        }),
    ),
  ).sort()
  const probe = document.createElement('div')
  probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px'
  const scope = document.querySelector('.gv-root') || document.body
  scope.appendChild(probe)

  const measure = (property, value) => {
    const chip = document.createElement('span')
    chip.style[property] = value
    probe.appendChild(chip)
    const style = getComputedStyle(chip)
    return parse(property === 'backgroundColor' ? style.backgroundColor : style.color)
  }

  const baseFill = measure('backgroundColor', 'var(--gv-bg)') || pageBg
  const surface1 = over(measure('backgroundColor', 'var(--gv-surface-1)') || baseFill, { ...baseFill, a: 1 })

  tokenNames.forEach((name) => {
    const raw = getComputedStyle(scope).getPropertyValue(name).trim()
    const isColor = raw !== '' && CSS.supports('color', raw)
    if (!isColor) return
    const fill = measure('backgroundColor', 'var(' + name + ')')
    const text = measure('color', 'var(' + name + ')')
    tokens[name] = {
      fill: fill ? hex(fill) : null,
      text: text ? hex(text) : null,
      onSurface: fill ? hex(over(fill, surface1)) : null,
      delta: fill ? Number(ratio(over(fill, surface1), surface1).toFixed(2)) : null,
    }
  })
  tokens['__surface-1'] = { fill: hex(surface1) }
  tokens['__surface-2'] = { fill: hex(over(measure('backgroundColor', 'var(--gv-surface-2)') || surface1, surface1)) }
  tokens['__surface-pop'] = { fill: hex(over(measure('backgroundColor', 'var(--gv-surface-pop)') || surface1, surface1)) }
  tokens['__bg'] = { fill: hex(baseFill) }

  // Every class the stylesheet mentions must survive CSS parsing: a dropped
  // rule means a syntax error somewhere above it, which silently unmakes the
  // rest of the sheet.
  const declared = new Set()
  Array.from(document.querySelectorAll('style')).forEach((tag) => {
    ;(tag.textContent.match(/\.gv-[a-z0-9-]+/g) || []).forEach((name) => declared.add(name))
  })
  const parsedNames = new Set()
  Array.from(document.styleSheets).forEach((sheet) => {
    let rules = []
    try {
      rules = Array.from(sheet.cssRules)
    } catch {
      return
    }
    rules.forEach((rule) => {
      ;(rule.cssText.match(/\.gv-[a-z0-9-]+/g) || []).forEach((name) => parsedNames.add(name))
    })
  })
  const missing = Array.from(declared).filter((name) => !parsedNames.has(name)).sort()

  const blob = { theme: themeDark ? 'dark' : 'light', contrast, iconContrast, iconsChecked, geometry, overflow, tokens, missing }
  const out = document.createElement('pre')
  out.id = 'audit-out'
  out.textContent = btoa(unescape(encodeURIComponent(JSON.stringify(blob))))
  document.body.appendChild(out)
})()
`

const fixtures = await loadFixtures()
await mkdir(outDir, { recursive: true })

const results = {}
for (const theme of ['dark', 'light']) {
  const html = renderPage(theme, renderFixture(fixtures.GALLERY)).replace(
    '</body>',
    `<script>${AUDIT_SCRIPT}</script></body>`,
  )
  const file = join(outDir, `audit-${theme}.html`)
  await writeFile(file, html, 'utf8')
  const dom = execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1560,6400',
      '--virtual-time-budget=2500',
      '--dump-dom',
      file,
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
  )
  const match = /<pre id="audit-out">([A-Za-z0-9+/=]+)<\/pre>/.exec(dom)
  if (!match) {
    console.error(`audit failed for ${theme}: no output block`)
    process.exit(1)
  }
  results[theme] = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'))
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(results, null, 2))
} else {
  for (const theme of ['dark', 'light']) {
    const report = results[theme]
    console.log(`\n=== ${theme.toUpperCase()} ===`)
    console.log(`contrast issues: ${report.contrast.length}`)
    for (const issue of report.contrast.slice(0, 40)) {
      console.log(
        `  ${issue.ratio.toFixed(2)}:1 < ${issue.threshold}  ${issue.element}  "${issue.text}"  ${issue.color} on ${issue.background}  ${issue.size}px/${issue.weight}`,
      )
    }
    console.log(`overflow issues: ${report.overflow.length}`)
    for (const issue of report.overflow.slice(0, 20)) {
      console.log(`  ${issue.axis}+${issue.by}px  ${issue.element} in ${issue.parent}  (${issue.shot})`)
    }
    console.log(`icon contrast issues: ${report.iconContrast.length} (${report.iconsChecked} icons checked)`)
    for (const issue of report.iconContrast.slice(0, 20)) {
      console.log(`  ${issue.ratio.toFixed(2)}:1 < 3  ${issue.element}  ${issue.color} on ${issue.background}  (${issue.shot})`)
    }
    console.log(`unparsed rules: ${report.missing.length}${report.missing.length ? '  ' + report.missing.join(' ') : ''}`)
  }

  console.log('\n=== TOKENS ===')
  const tokenNames = Object.keys(results.dark.tokens).sort()
  const isHue = (name) => name.startsWith('--gv-hue') || name.startsWith('--gv-folder')
  for (const name of tokenNames) {
    if (isHue(name)) continue
    const dark = results.dark.tokens[name]
    const light = results.light.tokens[name]
    const format = (entry) => {
      if (!entry) return '-'
      const parts = [entry.fill || entry.text]
      if (entry.onSurface && entry.delta !== null && entry.delta !== undefined) parts.push(`Δ${entry.delta}`)
      return parts.filter(Boolean).join('  ')
    }
    console.log(`  ${name.padEnd(24)} dark ${format(dark).padEnd(28)} light ${format(light)}`)
  }

  console.log('\n=== HUES (file + graph colours, need ≥3:1 on the pane) ===')
  for (const name of tokenNames) {
    if (!isHue(name)) continue
    const dark = results.dark.tokens[name]
    const light = results.light.tokens[name]
    console.log(
      `  ${name.padEnd(24)} dark ${(dark.fill || '-').padEnd(10)} Δ${String(dark.delta).padEnd(6)} light ${(light.fill || '-').padEnd(10)} Δ${light.delta}`,
    )
  }

  const geometry = {}
  for (const theme of ['dark', 'light']) {
    for (const item of results[theme].geometry) {
      const key = item.selector
      geometry[key] = geometry[key] || {}
      geometry[key][theme] = `${item.h}px h · ${item.w}px w · ${item.font} · r${item.radius}`
    }
  }
  console.log('\n=== GEOMETRY ===')
  for (const [selector, entry] of Object.entries(geometry)) {
    console.log(`  ${selector.padEnd(24)} dark: ${(entry.dark || '-').padEnd(34)} light: ${entry.light || '-'}`)
  }
}
