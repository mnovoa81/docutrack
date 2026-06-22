'use strict'

const fs = require('fs')
const path = require('path')
const { read: readQueue } = require('../utils/queue')

const OUT_PATH = path.join('docs', 'badge.svg')

function coverageColor(pct) {
  if (pct >= 80) return '#22c55e' // green
  if (pct >= 60) return '#f59e0b' // amber
  if (pct >= 40) return '#f97316' // orange
  return '#ef4444'                // red
}

function makeSvg(pct) {
  const label = 'docs'
  const value = `${pct}%`
  const labelW = 38
  const valueW = value.length <= 3 ? 32 : value.length <= 4 ? 38 : 44
  const totalW = labelW + valueW
  const color = coverageColor(pct)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="docs: ${pct}%">
  <title>docs: ${pct}%</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalW}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#555"/>
    <rect x="${labelW}" width="${valueW}" height="20" fill="${color}"/>
    <rect width="${totalW}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
    <text x="${Math.round(labelW / 2 * 10)}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(labelW - 10) * 10}" lengthAdjust="spacing">${label}</text>
    <text x="${Math.round(labelW / 2 * 10)}" y="140" transform="scale(.1)" textLength="${(labelW - 10) * 10}" lengthAdjust="spacing">${label}</text>
    <text x="${Math.round((labelW + valueW / 2) * 10)}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(valueW - 10) * 10}" lengthAdjust="spacing">${value}</text>
    <text x="${Math.round((labelW + valueW / 2) * 10)}" y="140" transform="scale(.1)" textLength="${(valueW - 10) * 10}" lengthAdjust="spacing">${value}</text>
  </g>
</svg>`
}

async function run() {
  if (!fs.existsSync('.docutrack')) {
    console.log('\nDocuTrack is not initialized. Run "npx docutrack init" first.\n')
    process.exit(1)
  }

  const queue = readQueue()
  const pending = queue.pending?.length || 0

  // Count doc files
  const docsDir = 'docs'
  let docCount = 0
  function walkDocs(dir) {
    if (!fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walkDocs(path.join(dir, e.name))
      else if (e.name.endsWith('.md') && e.name !== '.gitkeep') docCount++
    }
  }
  walkDocs(docsDir)

  const total = docCount + pending
  const pct = total > 0 ? Math.round((docCount / total) * 100) : 100

  const svg = makeSvg(pct)
  const outDir = path.dirname(OUT_PATH)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(OUT_PATH, svg)

  console.log(`\nBadge generated: ${OUT_PATH}  (coverage: ${pct}%)`)
  console.log('\nAdd to your README:')
  console.log(`  ![DocuTrack](./docs/badge.svg)\n`)
}

module.exports = { run }
