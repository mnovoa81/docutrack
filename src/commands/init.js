'use strict'

const fs = require('fs')
const path = require('path')
const { installHooks, SETTINGS_PATH } = require('../utils/settings')

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates')
const VALID_TEMPLATES = ['nextjs', 'fastapi', 'express', 'monorepo', 'go']

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

function autoDetectTemplate() {
  // Node.js: check package.json
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    if (deps.next) return 'nextjs'
    if (pkg.workspaces || fs.existsSync('pnpm-workspace.yaml') || fs.existsSync('turbo.json')) return 'monorepo'
    if (deps.express || deps['@types/express'] || deps.fastify || deps.koa) return 'express'
  } catch { /* not a node project */ }

  // Python: check for FastAPI
  for (const f of ['requirements.txt', 'pyproject.toml', 'Pipfile']) {
    if (!fs.existsSync(f)) continue
    const content = fs.readFileSync(f, 'utf8').toLowerCase()
    if (content.includes('fastapi')) return 'fastapi'
  }

  // Go
  if (fs.existsSync('go.mod')) return 'go'

  return null
}

async function run(args) {
  console.log('\nDocuTrack — initializing in current project\n')

  // Guard: already initialized
  if (fs.existsSync('.docutrack')) {
    console.log('DocuTrack is already initialized in this project.')
    console.log('Run "docutrack status" to see the current queue.\n')
    return
  }

  // Resolve template
  const templateFlag = args?.find(a => a.startsWith('--template='))?.split('=')[1]
    || (args?.indexOf('--template') !== -1 ? args[args.indexOf('--template') + 1] : null)
  const template = (templateFlag && VALID_TEMPLATES.includes(templateFlag))
    ? templateFlag
    : autoDetectTemplate()

  if (templateFlag && !VALID_TEMPLATES.includes(templateFlag)) {
    console.log(`Unknown template: "${templateFlag}". Valid options: ${VALID_TEMPLATES.join(', ')}\n`)
    process.exit(1)
  }

  // 1. .docutrack/ structure
  fs.mkdirSync('.docutrack/hooks', { recursive: true })
  step('Created .docutrack/')

  // 2. Queue
  fs.writeFileSync('.docutrack/queue.json', JSON.stringify({ pending: [], lastClear: null }, null, 2))
  step('Created .docutrack/queue.json')

  // 3. Hook scripts
  copyFile(path.join(TEMPLATES_DIR, 'hooks', 'post-tool-use.js'), '.docutrack/hooks/post-tool-use.js')
  copyFile(path.join(TEMPLATES_DIR, 'hooks', 'on-stop.js'), '.docutrack/hooks/on-stop.js')
  step('Installed hooks → .docutrack/hooks/')

  // 4. /docs structure
  copyDir(path.join(TEMPLATES_DIR, 'docs'), 'docs')
  step('Created docs/ (modules/, decisions/, api/)')

  // 5. ARCHITECTURE.md — use stack template if available, else base
  if (!fs.existsSync('ARCHITECTURE.md')) {
    const stackArch = template && path.join(TEMPLATES_DIR, 'stacks', template, 'ARCHITECTURE.md')
    const archSrc = (stackArch && fs.existsSync(stackArch))
      ? stackArch
      : path.join(TEMPLATES_DIR, 'ARCHITECTURE.md')
    copyFile(archSrc, 'ARCHITECTURE.md')
    step('Created ARCHITECTURE.md' + (template ? ` (${template} template)` : ''))
  } else {
    step('ARCHITECTURE.md already exists — skipped')
  }

  // 6. Slash commands
  const commandsDir = path.join(TEMPLATES_DIR, 'commands')
  for (const name of fs.readdirSync(commandsDir)) {
    copyFile(path.join(commandsDir, name), path.join('.claude', 'commands', name))
  }
  step('Installed slash commands → .claude/commands/ (doc-map, arch-review, adr-new, ask-docs)')

  // 7. Documentalista — use stack-specific version if available
  const stackAgent = template && path.join(TEMPLATES_DIR, 'stacks', template, 'documentalista.md')
  const agentSrc = (stackAgent && fs.existsSync(stackAgent))
    ? stackAgent
    : path.join(TEMPLATES_DIR, 'agents', 'documentalista.md')
  copyFile(agentSrc, '.claude/agents/documentalista.md')
  step('Installed documentalista subagent → .claude/agents/documentalista.md' + (template ? ` (${template})` : ''))

  // 8. docutrack.config.json
  if (!fs.existsSync('docutrack.config.json')) {
    const cfgSrc = path.join(TEMPLATES_DIR, 'docutrack.config.json')
    let cfg = JSON.parse(fs.readFileSync(cfgSrc, 'utf8'))
    if (template) cfg.template = template
    else delete cfg.template
    fs.writeFileSync('docutrack.config.json', JSON.stringify(cfg, null, 2))
    step('Created docutrack.config.json')
  }

  // 9. Hooks in .claude/settings.json
  const installed = installHooks()
  step(installed
    ? `Registered hooks in ${SETTINGS_PATH}`
    : `Hooks already registered in ${SETTINGS_PATH} — skipped`)

  // 10. Detect if this is an existing project with source files
  const hasExistingCode = detectExistingCode()

  // 11. Print next steps
  const snippetPath = path.join(TEMPLATES_DIR, 'claude-snippet.md')
  const snippet = fs.readFileSync(snippetPath, 'utf8')
  copyFile(snippetPath, '.docutrack/claude-snippet.md')

  const templateLine = template
    ? `\n  Stack template   : ${template}`
    : ''

  const existingProjectTip = hasExistingCode ? `
Existing project detected — bootstrap your docs:
  1. Run: docutrack scan          (queues all source files at once)
  2. In Claude Code, say: "Run the documentalista to document all pending files"
  3. Run: docutrack serve         (view the populated docs)
` : `
What DocuTrack does from here:
  • After every file edit → logs the file to .docutrack/queue.json
  • When the session ends → the documentalista subagent updates the docs
  • Run "docutrack serve" to open the documentation web viewer
  • Run "docutrack status" to see coverage, pending, and stale docs
  • Use /doc-map, /arch-review, /adr-new inside Claude Code sessions
`

  console.log(`
Done. DocuTrack is active.${templateLine}
${existingProjectTip}
Add this to your CLAUDE.md:
${'─'.repeat(52)}
${snippet}${'─'.repeat(52)}

(The snippet is also saved at .docutrack/claude-snippet.md)
`)
}

function detectExistingCode() {
  const SOURCE_DIRS = ['src', 'lib', 'app', 'routes', 'controllers', 'handlers', 'api', 'pkg', 'internal']
  const SOURCE_EXTS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.mjs']
  for (const dir of SOURCE_DIRS) {
    if (!fs.existsSync(dir)) continue
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && SOURCE_EXTS.includes(path.extname(entry.name))) return true
    }
  }
  return false
}

module.exports = { run }
