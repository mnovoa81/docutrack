'use strict'

const fs = require('fs')
const path = require('path')

const FORMATS = ['mintlify', 'docusaurus']

async function run(args) {
  if (!fs.existsSync('.docutrack')) {
    console.log('\nDocuTrack is not initialized. Run "npx docutrack init" first.\n')
    process.exit(1)
  }

  const formatArg = args.find(a => a.startsWith('--format='))?.split('=')[1]
    || (args.indexOf('--format') !== -1 ? args[args.indexOf('--format') + 1] : null)

  const outArg = args.find(a => a.startsWith('--out='))?.split('=')[1]
    || (args.indexOf('--out') !== -1 ? args[args.indexOf('--out') + 1] : null)

  if (!formatArg || !FORMATS.includes(formatArg)) {
    console.log(`\nUsage: docutrack export --format <${FORMATS.join('|')}> [--out <dir>]\n`)
    process.exit(1)
  }

  const outDir = outArg || `docutrack-${formatArg}`

  if (formatArg === 'mintlify') await exportMintlify(outDir)
  else if (formatArg === 'docusaurus') await exportDocusaurus(outDir)
}

// ── Mintlify ──────────────────────────────────────────────────────────────
async function exportMintlify(outDir) {
  console.log(`\nExporting to Mintlify format → ${outDir}/\n`)

  const nav = []
  fs.mkdirSync(outDir, { recursive: true })

  // ARCHITECTURE.md → overview.mdx
  if (fs.existsSync('ARCHITECTURE.md')) {
    const content = fs.readFileSync('ARCHITECTURE.md', 'utf8')
    fs.writeFileSync(path.join(outDir, 'overview.mdx'), `---\ntitle: "Architecture"\ndescription: "System architecture overview"\n---\n\n${content}`)
    nav.push('overview')
    console.log('  ✓ overview.mdx')
  }

  // docs/modules/ → modules/
  const modulesNav = copySection('docs/modules', path.join(outDir, 'modules'), 'mdx')
  if (modulesNav.length) {
    nav.push({ group: 'Modules', pages: modulesNav.map(f => `modules/${f}`) })
    console.log(`  ✓ modules/ (${modulesNav.length} files)`)
  }

  // docs/decisions/ → decisions/
  const decisionsNav = copySection('docs/decisions', path.join(outDir, 'decisions'), 'mdx')
  if (decisionsNav.length) {
    nav.push({ group: 'Decisions', pages: decisionsNav.map(f => `decisions/${f}`) })
    console.log(`  ✓ decisions/ (${decisionsNav.length} files)`)
  }

  // docs/api/ → api-reference/
  const apiNav = copySection('docs/api', path.join(outDir, 'api-reference'), 'mdx')
  if (apiNav.length) {
    nav.push({ group: 'API Reference', pages: apiNav.map(f => `api-reference/${f}`) })
    console.log(`  ✓ api-reference/ (${apiNav.length} files)`)
  }

  // Copy openapi.json if exists
  if (fs.existsSync('docs/api/openapi.json')) {
    fs.copyFileSync('docs/api/openapi.json', path.join(outDir, 'openapi.json'))
    console.log('  ✓ openapi.json')
  }

  // Generate mint.json
  const mintJson = {
    $schema: 'https://mintlify.com/schema.json',
    name: getProjectName(),
    logo: { light: '/logo/light.svg', dark: '/logo/dark.svg' },
    favicon: '/favicon.svg',
    colors: { primary: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
    topbarLinks: [],
    topbarCtaButton: { name: 'GitHub', url: 'https://github.com/your-org/your-repo' },
    tabs: [],
    anchors: [],
    navigation: nav,
    footerSocials: {},
  }
  fs.writeFileSync(path.join(outDir, 'mint.json'), JSON.stringify(mintJson, null, 2))
  console.log('  ✓ mint.json')
  console.log(`\nDone. To preview:\n  cd ${outDir} && npx mintlify dev\n`)
}

// ── Docusaurus ─────────────────────────────────────────────────────────────
async function exportDocusaurus(outDir) {
  console.log(`\nExporting to Docusaurus format → ${outDir}/\n`)

  const docsDir = path.join(outDir, 'docs')
  fs.mkdirSync(docsDir, { recursive: true })

  const sidebar = {}

  // ARCHITECTURE.md → docs/overview.md
  if (fs.existsSync('ARCHITECTURE.md')) {
    const content = fs.readFileSync('ARCHITECTURE.md', 'utf8')
    fs.writeFileSync(path.join(docsDir, 'overview.md'), `---\nsidebar_position: 1\n---\n\n${content}`)
    console.log('  ✓ docs/overview.md')
  }

  // docs/modules/ → docs/modules/
  const modulesItems = copySection('docs/modules', path.join(docsDir, 'modules'), 'md')
  if (modulesItems.length) {
    sidebar.modules = { label: 'Modules', items: modulesItems }
    console.log(`  ✓ docs/modules/ (${modulesItems.length} files)`)
  }

  // docs/decisions/ → docs/decisions/
  const decisionsItems = copySection('docs/decisions', path.join(docsDir, 'decisions'), 'md')
  if (decisionsItems.length) {
    sidebar.decisions = { label: 'Decisions', items: decisionsItems }
    console.log(`  ✓ docs/decisions/ (${decisionsItems.length} files)`)
  }

  // docs/api/ → docs/api/
  const apiItems = copySection('docs/api', path.join(docsDir, 'api'), 'md')
  if (apiItems.length) {
    sidebar.api = { label: 'API', items: apiItems }
    console.log(`  ✓ docs/api/ (${apiItems.length} files)`)
  }

  // sidebars.js
  const sidebarJs = `/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'overview',
    ${sidebar.modules ? `{ type: 'category', label: 'Modules', items: ${JSON.stringify(sidebar.modules.items.map(f => `modules/${f}`))} },` : ''}
    ${sidebar.decisions ? `{ type: 'category', label: 'Decisions', items: ${JSON.stringify(sidebar.decisions.items.map(f => `decisions/${f}`))} },` : ''}
    ${sidebar.api ? `{ type: 'category', label: 'API', items: ${JSON.stringify(sidebar.api.items.map(f => `api/${f}`))} },` : ''}
  ],
}
module.exports = sidebars`
  fs.writeFileSync(path.join(outDir, 'sidebars.js'), sidebarJs)

  // Minimal docusaurus.config.js
  const name = getProjectName()
  const config = `/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '${name}',
  tagline: 'Generated by DocuTrack',
  url: 'https://your-domain.com',
  baseUrl: '/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  i18n: { defaultLocale: 'en', locales: ['en'] },
  presets: [['classic', { docs: { sidebarPath: require.resolve('./sidebars.js'), routeBasePath: '/' }, blog: false, theme: { customCss: [] } }]],
  themeConfig: { navbar: { title: '${name}', items: [] }, footer: { style: 'dark', copyright: 'Generated by DocuTrack' } },
}
module.exports = config`
  fs.writeFileSync(path.join(outDir, 'docusaurus.config.js'), config)
  console.log('  ✓ docusaurus.config.js + sidebars.js')
  console.log(`\nDone. To preview:\n  cd ${outDir} && npx create-docusaurus@latest . classic --skip-install && npm install && npm start\n`)
}

// ── Helpers ────────────────────────────────────────────────────────────────
function copySection(srcDir, destDir, ext) {
  const files = []
  if (!fs.existsSync(srcDir)) return files
  fs.mkdirSync(destDir, { recursive: true })
  for (const entry of fs.readdirSync(srcDir)) {
    if (!entry.endsWith('.md') || entry === '.gitkeep') continue
    const base = entry.replace('.md', '')
    const content = fs.readFileSync(path.join(srcDir, entry), 'utf8')
    const destFile = `${base}.${ext}`
    fs.writeFileSync(path.join(destDir, destFile), content)
    files.push(base)
  }
  return files
}

function getProjectName() {
  try { return JSON.parse(fs.readFileSync('package.json', 'utf8')).name || 'Project' } catch { return 'Project' }
}

module.exports = { run }
