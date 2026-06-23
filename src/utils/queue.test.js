'use strict'

const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const os = require('os')

const { read, add, clear } = require('./queue')

let tmpDir

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docutrack-test-'))
})

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('queue', () => {
  it('read returns empty queue when file does not exist', () => {
    const q = read(path.join(tmpDir, 'nonexistent', 'queue.json'))
    assert.deepEqual(q.pending, [])
    assert.equal(q.lastClear, null)
  })

  it('add writes a file to the queue', () => {
    const qPath = path.join(tmpDir, 'queue.json')
    add('src/utils/foo.ts', qPath)
    const q = read(qPath)
    assert.equal(q.pending.length, 1)
    assert.equal(q.pending[0].file, 'src/utils/foo.ts')
    assert.ok(q.pending[0].addedAt)
  })

  it('add does not duplicate existing entries', () => {
    const qPath = path.join(tmpDir, 'queue2.json')
    const existing = { pending: [{ file: 'src/foo.ts', addedAt: new Date().toISOString() }], lastClear: null }
    fs.writeFileSync(qPath, JSON.stringify(existing, null, 2))
    add('src/foo.ts', qPath)
    const q = read(qPath)
    assert.equal(q.pending.length, 1)
  })

  it('clear empties the queue', () => {
    const qPath = path.join(tmpDir, 'queue3.json')
    add('src/foo.ts', qPath)
    clear(qPath)
    const q = read(qPath)
    assert.equal(q.pending.length, 0)
    assert.ok(q.lastClear)
  })
})
