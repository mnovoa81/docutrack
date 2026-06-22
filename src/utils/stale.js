'use strict'

const fs = require('fs')
const path = require('path')

const SOURCE_EXTS = ['.js', '.ts', '.mjs', '.cjs', '.py', '.go', '.rs', '.rb', '.java', '.kt', '.cs', '.php']
const SOURCE_DIRS = ['src', 'lib', 'app', 'pkg', 'server', 'backend', 'api']

function findStale(projectRoot) {
  const stale = []
  const docsDir = path.join(projectRoot, 'docs', 'modules')
  if (!fs.existsSync(docsDir)) return stale

  for (const entry of fs.readdirSync(docsDir)) {
    if (!entry.endsWith('.md') || entry === '.gitkeep') continue

    const docPath = path.join(docsDir, entry)
    const docMtime = fs.statSync(docPath).mtimeMs
    const moduleName = entry.replace('.md', '')

    const sourceFile = findSourceFile(projectRoot, moduleName)
    if (!sourceFile) continue

    const srcMtime = fs.statSync(sourceFile).mtimeMs
    if (srcMtime > docMtime) {
      stale.push({
        doc: `docs/modules/${entry}`,
        source: path.relative(projectRoot, sourceFile).replace(/\\/g, '/'),
        docMtime,
        srcMtime,
        staleSinceMs: srcMtime - docMtime,
      })
    }
  }

  return stale
}

function findSourceFile(root, name) {
  // Try: src/<name>.js, src/services/<name>.js, src/<name>/index.js, etc.
  for (const dir of SOURCE_DIRS) {
    const dirPath = path.join(root, dir)
    if (!fs.existsSync(dirPath)) continue

    for (const ext of SOURCE_EXTS) {
      // Direct: src/auth.js
      const direct = path.join(dirPath, `${name}${ext}`)
      if (fs.existsSync(direct)) return direct

      // Index: src/auth/index.js
      const index = path.join(dirPath, name, `index${ext}`)
      if (fs.existsSync(index)) return index
    }

    // Walk one subdirectory level: src/services/auth.js, src/middleware/auth.js
    try {
      for (const sub of fs.readdirSync(dirPath, { withFileTypes: true })) {
        if (!sub.isDirectory()) continue
        for (const ext of SOURCE_EXTS) {
          const nested = path.join(dirPath, sub.name, `${name}${ext}`)
          if (fs.existsSync(nested)) return nested
        }
      }
    } catch { /* ignore */ }
  }

  return null
}

function formatAge(ms) {
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

module.exports = { findStale, formatAge }
