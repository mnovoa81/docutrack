'use strict'

// PostToolUse hook — fires after every Write, Edit, or MultiEdit
// Adds the modified file to .docutrack/queue.json

const fs = require('fs')
const path = require('path')

let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => { raw += chunk })
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(raw)
    const filePath = extractFilePath(event)
    if (filePath) addToQueue(filePath)
  } catch {
    // Never crash the agent session over a hook error
  }
  process.exit(0)
})

function extractFilePath(event) {
  const { tool_name, tool_input } = event
  if (!tool_input) return null

  if (tool_name === 'Write' || tool_name === 'Edit' || tool_name === 'MultiEdit') {
    return tool_input.file_path || null
  }
  return null
}

function addToQueue(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  const ignored = [
    'docs/', '.docutrack/', '.claude/', 'node_modules/', '.git/',
  ]
  if (ignored.some(p => normalized.startsWith(p))) return

  const queuePath = path.join('.docutrack', 'queue.json')
  if (!fs.existsSync(path.dirname(queuePath))) return // not initialized

  let queue = { pending: [], lastClear: null }
  try {
    queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'))
  } catch { /* start fresh */ }

  if (queue.pending.some(e => e.file === normalized)) return

  queue.pending.push({ file: normalized, addedAt: new Date().toISOString() })
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2))
}
