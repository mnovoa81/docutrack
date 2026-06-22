'use strict'

const fs = require('fs')
const path = require('path')

const QUEUE_PATH = path.join('.docutrack', 'queue.json')

const EMPTY_QUEUE = { pending: [], lastClear: null }

// Folders whose changes should never trigger doc requirements
const IGNORED_PREFIXES = [
  'docs/',
  'docs\\',
  '.docutrack/',
  '.docutrack\\',
  '.claude/',
  '.claude\\',
  'node_modules/',
  'node_modules\\',
]

function isIgnored(filePath) {
  return IGNORED_PREFIXES.some(prefix => filePath.startsWith(prefix))
}

function read() {
  if (!fs.existsSync(QUEUE_PATH)) return { ...EMPTY_QUEUE }
  try {
    return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'))
  } catch {
    return { ...EMPTY_QUEUE }
  }
}

function write(queue) {
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2))
}

function add(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  if (isIgnored(normalized)) return

  const queue = read()
  const alreadyQueued = queue.pending.some(e => e.file === normalized)
  if (alreadyQueued) return

  queue.pending.push({
    file: normalized,
    addedAt: new Date().toISOString(),
  })
  write(queue)
}

function clear() {
  write({ pending: [], lastClear: new Date().toISOString() })
}

function pendingCount() {
  return read().pending.length
}

module.exports = { read, write, add, clear, pendingCount, QUEUE_PATH }
