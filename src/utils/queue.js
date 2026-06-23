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

function read(queuePath = QUEUE_PATH) {
  if (!fs.existsSync(queuePath)) return { ...EMPTY_QUEUE }
  try {
    return JSON.parse(fs.readFileSync(queuePath, 'utf8'))
  } catch {
    return { ...EMPTY_QUEUE }
  }
}

function write(queue, queuePath = QUEUE_PATH) {
  fs.mkdirSync(path.dirname(queuePath), { recursive: true })
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2))
}

function add(filePath, queuePath = QUEUE_PATH) {
  const normalized = filePath.replace(/\\/g, '/')
  if (isIgnored(normalized)) return

  const queue = read(queuePath)
  const alreadyQueued = queue.pending.some(e => e.file === normalized)
  if (alreadyQueued) return

  queue.pending.push({
    file: normalized,
    addedAt: new Date().toISOString(),
  })
  write(queue, queuePath)
}

function clear(queuePath = QUEUE_PATH) {
  write({ pending: [], lastClear: new Date().toISOString() }, queuePath)
}

function pendingCount() {
  return read().pending.length
}

module.exports = { read, write, add, clear, pendingCount, QUEUE_PATH }
