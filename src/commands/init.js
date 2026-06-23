'use strict'

const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { installHooks, SETTINGS_PATH } = require('../utils/settings')
const { isPortInUse, startServerDaemon, isServerRunning } = require('../utils/daemon')
const { write: writeQueue } = require('../utils/queue')

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates')
const VALID_TEMPLATES = ['nextjs', 'fastapi', 'express', 'monorepo', 'go']
const PORT = 4242

const SOURCE_DIRS = ['src', 'lib', 'app', 'pkg', 'internal', 'api', 'routes', 'controllers', 'handlers', 'packages']
const SOURCE_EXTS = new Set(['.js', '.ts', '.mjs', '.jsx', '.tsx', '.py', '.go'])
const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', '__pycache__', '.docutrack', 'docs', '.worktrees', 'coverage', '.turbo'])
const IGNORE_RE = [/\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/, /\.d\.ts$/, /\.min\.js$/]

function copyFile(src, dest) {
  const dir = path.dirname(dest)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.copyFileSync(src, dest)
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(srcPath, destPath)
    else copyFile(srcPath, destPath)
  }
}

function step(msg) { process.stdout.write(`  ${msg}\n`) }

function openBrowser(url) {
  try {
    const cmd = process.platform === 'win32' ? `start "" "${url}"`
      : process.platform === 'darwin' ? `open "${url}"`
      : `xdg-open "${url}"`
    exec(cmd)
  } catch { /* best-effort */ }
}

function autoDetectTemplate() {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    if (deps.next) return 'nextjs'
    if (pkg.workspaces || fs.existsSync('pnpm-workspace.yaml') || fs.existsSync('turbo.json')) return 'monorepo'
    if (deps.express || deps['@types/express'] || deps.fastify || deps.koa) return 'express'
  } catch { /* not a node project */ }
  for (const f of ['requirements.txt', 'pyproject.toml', 'Pipfile']) {
    if (!fs.existsSync(f)) continue
    if (fs.readFileSync(f, 'utf8').toLowerCase().includes('fastapi')) return 'fastapi'
  }
  if (fs.existsSync('go.mod')) return 'go'
  return null
}

function collectSourceFiles(root) {
  const files = []
  const walk = (dir, depth = 0) => {
    if (depth > 6 || !fs.existsSync(dir)) return
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name) && !e.name.startsWith('.')) walk(path.join(dir, e.name), depth + 1)
      } else if (e.isFile() && SOURCE_EXTS.has(path.extname(e.name))) {
        if (!IGNORE_RE.some(re => re.test(e.name))) {
          files.push(path.relative(root, path.join(dir, e.name)).replace(/\\/g, '/'))
        }
      }
    }
  }
  for (const dir of SOURCE_DIRS) walk(path.join(root, dir))
  // Root-level source files (index.js, main.go, server.ts, etc.)
  try {
    for (const e of fs.readdirSync(root, { withFileTypes: true })) {
      if (e.isFile() && SOURCE_EXTS.has(path.extname(e.name)) && !IGNORE_RE.some(re => re.test(e.name))) {
        files.push(e.name)
      }
    }
  } catch { /* ok */ }
  return files
}

async function run(args) {
  const root = process.cwd()
  const noServe = args?.includes('--no-serve')

  // ── Guard: already initialized ────────────────────────────────
  if (fs.existsSync('.docutrack')) {
    // If called again, just ensure server is running
    if (!noServe) {
      const portBusy = await isPortInUse(PORT)
      const alive = isServerRunning(root)
      if (!portBusy && !alive) {
        const { pid } = startServerDaemon(root, PORT)
        await new Promise(r => setTimeout(r, 900))
        console.log(`\n  DocuTrack viewer → http://localhost:${PORT}  (pid ${pid})\n`)
        openBrowser(`http://localhost:${PORT}`)
      } else {
        console.log(`\n  DocuTrack already active → http://localhost:${PORT}\n`)
        openBrowser(`http://localhost:${PORT}`)
      }
    } else {
      console.log('\n  DocuTrack already initialized. Run "docutrack status" to see the queue.\n')
    }
    return
  }

  console.log('\n  DocuTrack — setting up your project\n  ' + '─'.repeat(42))

  // ── Resolve template ───────────────────────────────────────────
  const templateFlag = args?.find(a => a.startsWith('--template='))?.split('=')[1]
    || (args?.indexOf('--template') !== -1 ? args[args.indexOf('--template') + 1] : null)
  const template = (templateFlag && VALID_TEMPLATES.includes(templateFlag))
    ? templateFlag
    : autoDetectTemplate()

  if (templateFlag && !VALID_TEMPLATES.includes(templateFlag)) {
    console.error(`Unknown template: "${templateFlag}". Valid options: ${VALID_TEMPLATES.join(', ')}\n`)
    process.exit(1)
  }

  // ── 1. .docutrack/ structure ───────────────────────────────────
  fs.mkdirSync('.docutrack/hooks', { recursive: true })
  step('✓  Created .docutrack/')

  // ── 2. Queue ───────────────────────────────────────────────────
  fs.writeFileSync('.docutrack/queue.json', JSON.stringify({ pending: [], lastClear: null }, null, 2))

  // ── 3. Hook scripts ────────────────────────────────────────────
  copyFile(path.join(TEMPLATES_DIR, 'hooks', 'post-tool-use.js'), '.docutrack/hooks/post-tool-use.js')
  copyFile(path.join(TEMPLATES_DIR, 'hooks', 'on-stop.js'), '.docutrack/hooks/on-stop.js')
  step('✓  Installed hooks (PostToolUse + Stop)')

  // ── 4. /docs structure ─────────────────────────────────────────
  copyDir(path.join(TEMPLATES_DIR, 'docs'), 'docs')

  // ── 5. ARCHITECTURE.md ─────────────────────────────────────────
  if (!fs.existsSync('ARCHITECTURE.md')) {
    const stackArch = template && path.join(TEMPLATES_DIR, 'stacks', template, 'ARCHITECTURE.md')
    const archSrc = (stackArch && fs.existsSync(stackArch))
      ? stackArch
      : path.join(TEMPLATES_DIR, 'ARCHITECTURE.md')
    copyFile(archSrc, 'ARCHITECTURE.md')
  }
  step(`✓  Created docs/ and ARCHITECTURE.md${template ? ` (${template})` : ''}`)

  // ── 6. Slash commands ──────────────────────────────────────────
  const commandsDir = path.join(TEMPLATES_DIR, 'commands')
  for (const name of fs.readdirSync(commandsDir)) {
    copyFile(path.join(commandsDir, name), path.join('.claude', 'commands', name))
  }

  // ── 7. Documentalista subagent ─────────────────────────────────
  const stackAgent = template && path.join(TEMPLATES_DIR, 'stacks', template, 'documentalista.md')
  const agentSrc = (stackAgent && fs.existsSync(stackAgent))
    ? stackAgent
    : path.join(TEMPLATES_DIR, 'agents', 'documentalista.md')
  copyFile(agentSrc, '.claude/agents/documentalista.md')
  step('✓  Installed slash commands + documentalista subagent')

  // ── 8. docutrack.config.json ───────────────────────────────────
  if (!fs.existsSync('docutrack.config.json')) {
    const cfgSrc = path.join(TEMPLATES_DIR, 'docutrack.config.json')
    let cfg = JSON.parse(fs.readFileSync(cfgSrc, 'utf8'))
    if (template) cfg.template = template
    else delete cfg.template
    fs.writeFileSync('docutrack.config.json', JSON.stringify(cfg, null, 2))
  }

  // ── 9. Hooks in .claude/settings.json ─────────────────────────
  const installed = installHooks()
  step(installed
    ? `✓  Registered hooks in ${SETTINGS_PATH}`
    : `✓  Hooks already registered`)

  // ── 10. Auto-write snippet to CLAUDE.md ───────────────────────
  const snippetPath = path.join(TEMPLATES_DIR, 'claude-snippet.md')
  const snippet = fs.readFileSync(snippetPath, 'utf8')
  copyFile(snippetPath, '.docutrack/claude-snippet.md')

  const CLAUDE_MD = 'CLAUDE.md'
  const SNIPPET_MARKER = 'DocuTrack — documentation auto-pilot'
  if (!fs.existsSync(CLAUDE_MD)) {
    fs.writeFileSync(CLAUDE_MD, snippet + '\n')
    step('✓  Created CLAUDE.md with DocuTrack auto-pilot')
  } else {
    const existing = fs.readFileSync(CLAUDE_MD, 'utf8')
    if (!existing.includes(SNIPPET_MARKER)) {
      fs.writeFileSync(CLAUDE_MD, existing.trimEnd() + '\n\n---\n\n' + snippet + '\n')
      step('✓  Added DocuTrack auto-pilot to existing CLAUDE.md')
    } else {
      step('✓  CLAUDE.md already has DocuTrack auto-pilot')
    }
  }

  // ── 11. Scan existing source files ────────────────────────────
  const sourceFiles = collectSourceFiles(root)
  if (sourceFiles.length > 0) {
    const now = new Date().toISOString()
    writeQueue({ pending: sourceFiles.map(f => ({ file: f, addedAt: now })), lastClear: null })
    step(`✓  Scanned ${sourceFiles.length} existing source file(s) — queued for documentation`)
  } else {
    step('✓  No existing source files — starting fresh')
  }

  // ── 12. Start viewer server ────────────────────────────────────
  if (!noServe) {
    const portBusy = await isPortInUse(PORT)
    if (!portBusy) {
      const { pid } = startServerDaemon(root, PORT)
      await new Promise(r => setTimeout(r, 900))
      step(`✓  Viewer started → http://localhost:${PORT}  (pid ${pid})`)
      openBrowser(`http://localhost:${PORT}`)
    } else {
      step(`✓  Viewer already running → http://localhost:${PORT}`)
      openBrowser(`http://localhost:${PORT}`)
    }
  }

  // ── Done ───────────────────────────────────────────────────────
  console.log('\n  ' + '─'.repeat(42))

  if (sourceFiles.length > 0) {
    console.log(`
  DocuTrack is ready. ${sourceFiles.length} file(s) queued.

  Open Claude Code in this project.
  Claude will automatically run the documentalista
  to document all queued files — no extra steps needed.
`)
  } else {
    console.log(`
  DocuTrack is ready.

  Open Claude Code in this project.
  Every file Claude writes will be documented automatically.
`)
  }
}

module.exports = { run }
