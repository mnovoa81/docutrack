'use strict'

const fs = require('fs')
const path = require('path')

const THRESHOLDS = {
  lines: { warn: 200, critical: 400 },
  exports: { warn: 10, critical: 20 },
  complexity: { warn: 15, critical: 30 },
  maxNesting: { warn: 4, critical: 6 },
}

function analyzeFile(filePath) {
  let content
  try { content = fs.readFileSync(filePath, 'utf8') } catch { return null }

  const ext = path.extname(filePath).slice(1)
  const lines = content.split('\n').filter(l => l.trim()).length // non-blank lines

  const metrics = {
    file: filePath,
    lines,
    exports: countExports(content, ext),
    complexity: countCyclomaticApprox(content),
    maxNesting: countMaxNesting(content, ext),
    warnings: [],
  }

  // Flag violations
  if (metrics.lines >= THRESHOLDS.lines.critical) metrics.warnings.push({ level: 'critical', message: `${metrics.lines} lines — consider splitting this module` })
  else if (metrics.lines >= THRESHOLDS.lines.warn) metrics.warnings.push({ level: 'warn', message: `${metrics.lines} lines — getting large` })

  if (metrics.exports >= THRESHOLDS.exports.critical) metrics.warnings.push({ level: 'critical', message: `${metrics.exports} exports — wide public API` })
  else if (metrics.exports >= THRESHOLDS.exports.warn) metrics.warnings.push({ level: 'warn', message: `${metrics.exports} exports` })

  if (metrics.complexity >= THRESHOLDS.complexity.critical) metrics.warnings.push({ level: 'critical', message: `complexity ${metrics.complexity} — high branching` })
  else if (metrics.complexity >= THRESHOLDS.complexity.warn) metrics.warnings.push({ level: 'warn', message: `complexity ${metrics.complexity}` })

  if (metrics.maxNesting >= THRESHOLDS.maxNesting.critical) metrics.warnings.push({ level: 'critical', message: `nesting depth ${metrics.maxNesting} — deeply nested code` })
  else if (metrics.maxNesting >= THRESHOLDS.maxNesting.warn) metrics.warnings.push({ level: 'warn', message: `nesting depth ${metrics.maxNesting}` })

  metrics.score = computeScore(metrics)
  return metrics
}

function countExports(content, ext) {
  if (ext === 'py') {
    return (content.match(/^(?:def|class)\s+[A-Z][A-Za-z0-9_]*/gm) || []).length
  }
  if (ext === 'go') {
    return (content.match(/^(?:func|type|var|const)\s+[A-Z]/gm) || []).length
  }
  // JS/TS
  const patterns = [
    /export\s+(?:async\s+)?function\s+/g,
    /export\s+(?:const|let|var)\s+/g,
    /export\s+class\s+/g,
    /exports\.[A-Za-z_$]/g,
  ]
  const moduleExports = content.match(/module\.exports\s*=\s*\{([^}]+)\}/)?.[1]
  const fromModule = moduleExports
    ? moduleExports.split(',').filter(s => /[A-Za-z_$]/.test(s.trim())).length
    : 0
  return patterns.reduce((acc, re) => acc + (content.match(re) || []).length, 0) + fromModule
}

function countCyclomaticApprox(content) {
  // Count decision points: if, else if, for, while, case, catch, ternary, &&, ||
  const DECISION_RE = /\b(if|else\s+if|for|while|case|catch)\b|\?(?!:)|&&|\|\|/g
  return (content.match(DECISION_RE) || []).length
}

function countMaxNesting(content, ext) {
  if (ext === 'py') return countPythonNesting(content)
  // Brace-based languages
  let depth = 0
  let max = 0
  for (const ch of content) {
    if (ch === '{') { depth++; if (depth > max) max = depth }
    else if (ch === '}') depth = Math.max(0, depth - 1)
  }
  return max
}

function countPythonNesting(content) {
  let max = 0
  for (const line of content.split('\n')) {
    const indent = line.match(/^(\s*)/)?.[1].length || 0
    const depth = Math.floor(indent / 4)
    if (depth > max) max = depth
  }
  return max
}

function computeScore(m) {
  // 0–100, lower = worse
  let score = 100
  score -= Math.max(0, m.lines - THRESHOLDS.lines.warn) * 0.1
  score -= Math.max(0, m.exports - THRESHOLDS.exports.warn) * 2
  score -= Math.max(0, m.complexity - THRESHOLDS.complexity.warn) * 1.5
  score -= Math.max(0, m.maxNesting - THRESHOLDS.maxNesting.warn) * 5
  return Math.round(Math.max(0, Math.min(100, score)))
}

function analyzeComplexity(projectRoot) {
  const results = []
  const SCAN_DIRS = ['src', 'lib', 'app', 'pkg', 'internal']
  const EXTS = new Set(['.js', '.ts', '.mjs', '.py', '.go', '.jsx', '.tsx'])
  const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__', '.docutrack', 'docs'])

  for (const dir of SCAN_DIRS) {
    const full = path.join(projectRoot, dir)
    if (!fs.existsSync(full)) continue
    walk(full, results, EXTS, IGNORE)
  }

  // Sort by score ascending (worst first)
  results.sort((a, b) => a.score - b.score)

  return {
    files: results,
    summary: {
      total: results.length,
      critical: results.filter(f => f.warnings.some(w => w.level === 'critical')).length,
      warnings: results.filter(f => f.warnings.some(w => w.level === 'warn') && !f.warnings.some(w => w.level === 'critical')).length,
      healthy: results.filter(f => f.warnings.length === 0).length,
    },
    thresholds: THRESHOLDS,
  }
}

function walk(dir, acc, exts, ignore, depth = 0) {
  if (depth > 8) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignore.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc, exts, ignore, depth + 1)
    else if (entry.isFile() && exts.has(path.extname(entry.name))) {
      const m = analyzeFile(full)
      if (m) acc.push(m)
    }
  }
}

module.exports = { analyzeComplexity, analyzeFile, THRESHOLDS }
