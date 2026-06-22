'use strict'

const fs = require('fs')
const path = require('path')
const { read, QUEUE_PATH } = require('../utils/queue')
const { findStale } = require('../utils/stale')

function countDocFiles() {
  let n = 0
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(dir, e.name))
      else if (e.name.endsWith('.md') && e.name !== '.gitkeep') n++
    }
  }
  walk('docs')
  return n
}

function formatAge(ms) {
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

async function run(args) {
  const asJson = args?.includes('--json')

  if (!fs.existsSync('.docutrack')) {
    if (asJson) { console.log(JSON.stringify({ error: 'not initialized' })); return }
    console.log('\nDocuTrack is not initialized. Run "npx docutrack init" first.\n')
    process.exit(1)
  }

  const queue = read()
  const pending = queue.pending || []
  const docCount = countDocFiles()
  const lastClear = queue.lastClear ? new Date(queue.lastClear).toLocaleString() : 'never'
  const stale = findStale(process.cwd())
  const total = docCount + pending.length
  const coverage = total > 0 ? Math.round((docCount / total) * 100) : 100

  if (asJson) {
    console.log(JSON.stringify({ pending: pending.length, docCount, staleCount: stale.length, coverage, lastClear }))
    return
  }

  const bar = (() => {
    const filled = Math.round(coverage / 10)
    return '▓'.repeat(filled) + '░'.repeat(10 - filled)
  })()

  console.log(`
DocuTrack Status
${'─'.repeat(48)}
  Coverage   : ${coverage}%  [${bar}]
  Doc files  : ${docCount}
  Pending    : ${pending.length}  (need documentation)
  Stale      : ${stale.length}  (source changed, doc outdated)
  Last clear : ${lastClear}
`)

  if (pending.length > 0) {
    console.log('  Files awaiting documentation:')
    for (const e of pending) {
      const age = formatAge(Date.now() - new Date(e.addedAt).getTime())
      console.log(`    ${e.file.padEnd(52)} ${age}`)
    }
    console.log()
  }

  if (stale.length > 0) {
    console.log('  Stale documentation (source newer than doc):')
    for (const s of stale) {
      const age = formatAge(s.staleSinceMs)
      console.log(`    ${s.doc.padEnd(40)} source changed ${age}`)
    }
    console.log()
  }

  if (pending.length === 0 && stale.length === 0) {
    console.log('  All good — documentation is up to date.\n')
  } else {
    console.log(`  To update docs, tell the agent:`)
    console.log(`    "Review .docutrack/queue.json and update the documentation"\n`)
  }
}

module.exports = { run }
