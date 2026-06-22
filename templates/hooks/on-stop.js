'use strict'

// Stop hook — fires when the Claude Code session ends
// Warns if there are files modified without documentation updates

const fs = require('fs')
const path = require('path')

const QUEUE_PATH = path.join('.docutrack', 'queue.json')

if (!fs.existsSync(QUEUE_PATH)) process.exit(0)

let queue
try {
  queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'))
} catch {
  process.exit(0)
}

if (!queue.pending || queue.pending.length === 0) process.exit(0)

const count = queue.pending.length
const files = queue.pending.map(e => `  - ${e.file}`).join('\n')

console.log(`
╔════════════════════════════════════════════════════╗
║  DocuTrack: ${String(count).padEnd(3)} file(s) need documentation     ║
╚════════════════════════════════════════════════════╝

${files}

To update the docs, tell the agent:
  "Update the documentation for the files in .docutrack/queue.json"

To clear the queue manually:
  npx docutrack clear
`)

process.exit(0)
