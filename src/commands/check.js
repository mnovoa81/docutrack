'use strict'

const fs = require('fs')
const path = require('path')
const { findStale } = require('../utils/stale')
const { analyzeDrift } = require('../utils/drift')
const { analyzeComplexity } = require('../analyzer/complexity')
const { read: readQueue } = require('../utils/queue')

const RESET = '\x1b[0m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const GREEN = '\x1b[32m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'

function color(level, text) {
  if (level === 'critical') return `${RED}${text}${RESET}`
  if (level === 'warn') return `${YELLOW}${text}${RESET}`
  return `${GREEN}${text}${RESET}`
}

async function run(args) {
  if (!fs.existsSync('.docutrack')) {
    console.log('\nDocuTrack is not initialized. Run "npx docutrack init" first.\n')
    process.exit(1)
  }

  const isJson = args.includes('--json')
  const isCI = args.includes('--ci')
  const root = process.cwd()

  if (!isJson) console.log(`\n${BOLD}DocuTrack Health Check${RESET}\n${'─'.repeat(52)}`)

  // ── 1. Queue status ────────────────────────────────────
  const queue = readQueue(root)
  const pendingCount = queue.pending.length

  // ── 2. Stale docs ──────────────────────────────────────
  const stale = findStale(root)

  // ── 3. Drift analysis ─────────────────────────────────
  let driftResults = []
  try { driftResults = analyzeDrift(root) } catch { /* no docs yet */ }

  // ── 4. Complexity ──────────────────────────────────────
  let complexityReport = { files: [], summary: { total: 0, critical: 0, warnings: 0, healthy: 0 } }
  try { complexityReport = analyzeComplexity(root) } catch { /* no src yet */ }

  const criticalFiles = complexityReport.files.filter(f => f.warnings.some(w => w.level === 'critical'))
  const warnFiles = complexityReport.files.filter(f =>
    f.warnings.some(w => w.level === 'warn') && !f.warnings.some(w => w.level === 'critical')
  )

  // ── JSON output for CI ─────────────────────────────────
  if (isJson) {
    const report = {
      pending: pendingCount,
      stale: stale.length,
      drift: driftResults.map(d => ({ module: d.module, severity: d.severity, undocumented: d.undocumented, orphaned: d.orphaned })),
      complexity: { summary: complexityReport.summary, critical: criticalFiles.map(f => ({ file: f.file, score: f.score, warnings: f.warnings })) },
      ok: pendingCount === 0 && stale.length === 0 && driftResults.filter(d => d.severity === 'high').length === 0 && criticalFiles.length === 0,
    }
    console.log(JSON.stringify(report, null, 2))
    if (!report.ok && isCI) process.exit(1)
    return
  }

  // ── Human-readable output ──────────────────────────────

  // Pending
  const pendingLabel = pendingCount === 0
    ? `${GREEN}✓ 0 pending${RESET}`
    : `${YELLOW}⚠ ${pendingCount} files need documentation${RESET}`
  console.log(`  Queue       : ${pendingLabel}`)

  // Stale
  const staleLabel = stale.length === 0
    ? `${GREEN}✓ 0 stale docs${RESET}`
    : `${YELLOW}⚠ ${stale.length} stale${RESET}`
  console.log(`  Stale docs  : ${staleLabel}`)

  // Drift
  const highDrift = driftResults.filter(d => d.severity === 'high').length
  const driftLabel = driftResults.length === 0
    ? `${GREEN}✓ no drift${RESET}`
    : highDrift > 0
      ? `${RED}✗ ${highDrift} high-drift module${highDrift !== 1 ? 's' : ''}${RESET}`
      : `${YELLOW}⚠ ${driftResults.length} module${driftResults.length !== 1 ? 's' : ''} drifted${RESET}`
  console.log(`  Doc drift   : ${driftLabel}`)

  // Complexity
  const complexityLabel = criticalFiles.length === 0
    ? warnFiles.length === 0
      ? `${GREEN}✓ ${complexityReport.summary.total} files healthy${RESET}`
      : `${YELLOW}⚠ ${warnFiles.length} complex${RESET}`
    : `${RED}✗ ${criticalFiles.length} critical${RESET}${criticalFiles.length > 0 && warnFiles.length > 0 ? ` + ${warnFiles.length} warnings` : ''}`
  console.log(`  Complexity  : ${complexityLabel}`)

  // ── Detail sections ────────────────────────────────────

  if (stale.length > 0) {
    console.log(`\n${BOLD}Stale Docs${RESET}`)
    for (const s of stale.slice(0, 8)) {
      const age = formatMs(s.staleSinceMs)
      console.log(`  ${YELLOW}${s.doc}${RESET}  ${DIM}(${age} behind)${RESET}`)
    }
    if (stale.length > 8) console.log(`  ${DIM}…and ${stale.length - 8} more${RESET}`)
  }

  if (driftResults.length > 0) {
    console.log(`\n${BOLD}Documentation Drift${RESET}`)
    for (const d of driftResults.slice(0, 6)) {
      console.log(`  ${color(d.severity, d.severity.toUpperCase())}  ${BOLD}${d.module}${RESET}  ${DIM}← ${d.sourceFile}${RESET}`)
      if (d.undocumented.length > 0) {
        console.log(`    ${RED}+undocumented${RESET}: ${d.undocumented.slice(0, 5).join(', ')}${d.undocumented.length > 5 ? ` …+${d.undocumented.length - 5}` : ''}`)
      }
      if (d.orphaned.length > 0) {
        console.log(`    ${DIM}-orphaned${RESET}:    ${d.orphaned.slice(0, 5).join(', ')}${d.orphaned.length > 5 ? ` …+${d.orphaned.length - 5}` : ''}`)
      }
    }
    if (driftResults.length > 6) console.log(`  ${DIM}…and ${driftResults.length - 6} more${RESET}`)
  }

  if (criticalFiles.length > 0 || warnFiles.length > 0) {
    console.log(`\n${BOLD}Complexity${RESET}`)
    const toShow = [...criticalFiles.slice(0, 4), ...warnFiles.slice(0, 3)]
    for (const f of toShow) {
      const rel = path.relative(root, f.file)
      const level = f.warnings.some(w => w.level === 'critical') ? 'critical' : 'warn'
      const msgs = f.warnings.map(w => w.message).join('  ·  ')
      console.log(`  ${color(level, level === 'critical' ? '✗' : '⚠')}  ${rel}  ${DIM}(score ${f.score})${RESET}`)
      console.log(`     ${DIM}${msgs}${RESET}`)
    }
    const shown = Math.min(4, criticalFiles.length) + Math.min(3, warnFiles.length)
    const total = criticalFiles.length + warnFiles.length
    if (total > shown) console.log(`  ${DIM}…and ${total - shown} more${RESET}`)
  }

  // ── Suggestions ────────────────────────────────────────
  const suggestions = buildSuggestions({ pendingCount, stale, driftResults, criticalFiles })
  if (suggestions.length > 0) {
    console.log(`\n${BOLD}Suggested Actions${RESET}`)
    for (const s of suggestions) console.log(`  → ${s}`)
  }

  // ── Overall verdict ────────────────────────────────────
  const isHealthy = pendingCount === 0 && stale.length === 0 && highDrift === 0 && criticalFiles.length === 0
  console.log(`\n${'─'.repeat(52)}`)
  if (isHealthy) {
    console.log(`  ${GREEN}${BOLD}✓ Project documentation is healthy.${RESET}\n`)
  } else {
    const issues = [
      pendingCount > 0 && `${pendingCount} pending`,
      stale.length > 0 && `${stale.length} stale`,
      driftResults.length > 0 && `${driftResults.length} drifted`,
      criticalFiles.length > 0 && `${criticalFiles.length} complex`,
    ].filter(Boolean).join(', ')
    console.log(`  ${YELLOW}${BOLD}⚠ Issues found: ${issues}${RESET}\n`)
  }

  if (isCI && !isHealthy) process.exit(1)
}

function buildSuggestions({ pendingCount, stale, driftResults, criticalFiles }) {
  const s = []
  if (pendingCount > 0) s.push('Run the documentalista subagent to clear the queue (or use /arch-review)')
  if (stale.length > 0) s.push(`Update docs for ${stale.length} stale module${stale.length !== 1 ? 's' : ''}, then run "docutrack clear"`)
  if (driftResults.filter(d => d.severity === 'high').length > 0) {
    const mods = driftResults.filter(d => d.severity === 'high').map(d => d.module).slice(0, 3).join(', ')
    s.push(`High drift: add missing exports to docs for ${mods}`)
  }
  if (criticalFiles.length > 0) {
    const f = path.basename(criticalFiles[0].file)
    s.push(`Consider splitting ${f} — it exceeds complexity thresholds`)
  }
  return s
}

function formatMs(ms) {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`
  return `${Math.round(ms / 86_400_000)}d`
}

module.exports = { run }
