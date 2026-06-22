'use strict'

const fs = require('fs')
const path = require('path')

// Regex extractors per language — pull exported/public identifiers from source
const EXTRACTORS = {
  js: extractJs,
  ts: extractJs,
  mjs: extractJs,
  cjs: extractJs,
  py: extractPython,
  go: extractGo,
}

function extractJs(content) {
  const names = new Set()
  const patterns = [
    /export\s+(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
    /export\s+(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
    /export\s+class\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
    /module\.exports\s*=\s*\{([^}]+)\}/g,
    /exports\.([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g,
  ]
  for (const re of patterns.slice(0, 4)) {
    let m
    while ((m = re.exec(content)) !== null) {
      if (re === patterns[3]) {
        // module.exports = { a, b, c }
        for (const name of m[1].split(',').map(s => s.trim().split(':')[0].trim()).filter(Boolean)) {
          if (/^[A-Za-z_$]/.test(name)) names.add(name)
        }
      } else {
        names.add(m[1])
      }
    }
  }
  // exports.name =
  let m
  const exportsRe = /exports\.([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g
  while ((m = exportsRe.exec(content)) !== null) names.add(m[1])
  return [...names]
}

function extractPython(content) {
  const names = new Set()
  // Public functions and classes (no leading underscore)
  const fnRe = /^def\s+([A-Za-z][A-Za-z0-9_]*)\s*\(/gm
  const classRe = /^class\s+([A-Za-z][A-Za-z0-9_]*)\s*[:(]/gm
  let m
  while ((m = fnRe.exec(content)) !== null) if (!m[1].startsWith('_')) names.add(m[1])
  while ((m = classRe.exec(content)) !== null) if (!m[1].startsWith('_')) names.add(m[1])
  return [...names]
}

function extractGo(content) {
  const names = new Set()
  // Exported functions and types start with uppercase
  const fnRe = /^func\s+([A-Z][A-Za-z0-9_]*)\s*\(/gm
  const typeRe = /^type\s+([A-Z][A-Za-z0-9_]*)\s+/gm
  let m
  while ((m = fnRe.exec(content)) !== null) names.add(m[1])
  while ((m = typeRe.exec(content)) !== null) names.add(m[1])
  return [...names]
}

function extractNamesFromDoc(docContent) {
  // Only extract code-span references — avoids false positives from headers/bold prose
  const names = new Set()
  const patterns = [
    /`([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g,         // `functionName(`  — most reliable
    /`([A-Za-z_$][A-Za-z0-9_$]{2,})`/g,           // `identifier`     — short inline code
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(docContent)) !== null) {
      // Skip common non-identifier words
      const skip = new Set(['true', 'false', 'null', 'undefined', 'string', 'number', 'object', 'array'])
      if (!skip.has(m[1].toLowerCase())) names.add(m[1])
    }
  }
  return [...names]
}

function analyzeDrift(projectRoot) {
  const docsDir = path.join(projectRoot, 'docs', 'modules')
  if (!fs.existsSync(docsDir)) return []

  const results = []

  for (const docFile of fs.readdirSync(docsDir)) {
    if (!docFile.endsWith('.md')) continue
    const moduleName = docFile.replace('.md', '')
    const docPath = path.join(docsDir, docFile)
    const docContent = fs.readFileSync(docPath, 'utf8')
    const docMtime = fs.statSync(docPath).mtimeMs

    // Find the corresponding source file
    const sourceFile = findSourceFile(projectRoot, moduleName)
    if (!sourceFile) continue

    const sourceStat = fs.statSync(sourceFile)
    if (sourceStat.mtimeMs <= docMtime) continue // Source not changed since doc update

    const srcContent = fs.readFileSync(sourceFile, 'utf8')
    const ext = path.extname(sourceFile).slice(1)
    const extractor = EXTRACTORS[ext]
    if (!extractor) continue

    const srcExports = extractor(srcContent)
    const docMentions = extractNamesFromDoc(docContent)

    const undocumented = srcExports.filter(name => !docMentions.includes(name))
    const orphaned = docMentions.filter(name => !srcExports.includes(name) && name.length > 2)

    if (undocumented.length > 0 || orphaned.length > 0) {
      results.push({
        module: moduleName,
        docPath: path.relative(projectRoot, docPath),
        sourceFile: path.relative(projectRoot, sourceFile),
        staleSinceMs: sourceStat.mtimeMs - docMtime,
        undocumented,
        orphaned,
        severity: undocumented.length > 3 ? 'high' : undocumented.length > 0 ? 'medium' : 'low',
      })
    }
  }

  return results
}

function findSourceFile(root, name) {
  const SEARCH_DIRS = ['src', 'lib', 'app', 'pkg', 'internal', '.']
  const EXTS = ['.js', '.ts', '.mjs', '.py', '.go', '.jsx', '.tsx']

  for (const dir of SEARCH_DIRS) {
    for (const ext of EXTS) {
      const full = path.join(root, dir, `${name}${ext}`)
      if (fs.existsSync(full)) return full
    }
  }

  // Recursive search with depth limit
  for (const dir of SEARCH_DIRS) {
    const found = walkFind(path.join(root, dir), name, EXTS, 3)
    if (found) return found
  }

  return null
}

function walkFind(dir, name, exts, maxDepth, depth = 0) {
  if (depth > maxDepth || !fs.existsSync(dir)) return null
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile()) {
      for (const ext of exts) {
        if (entry.name === `${name}${ext}`) return path.join(dir, entry.name)
      }
    } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      const found = walkFind(path.join(dir, entry.name), name, exts, maxDepth, depth + 1)
      if (found) return found
    }
  }
  return null
}

module.exports = { analyzeDrift, extractJs, extractPython, extractGo }
