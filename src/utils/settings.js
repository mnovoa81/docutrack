'use strict'

const fs = require('fs')
const path = require('path')

const SETTINGS_PATH = path.join('.claude', 'settings.json')

const DOCUTRACK_HOOKS = {
  PostToolUse: [
    {
      matcher: 'Write|Edit|MultiEdit',
      hooks: [
        {
          type: 'command',
          command: 'node .docutrack/hooks/post-tool-use.js',
        },
      ],
    },
  ],
  Stop: [
    {
      hooks: [
        {
          type: 'command',
          command: 'node .docutrack/hooks/on-stop.js',
        },
      ],
    },
  ],
}

function read() {
  if (!fs.existsSync(SETTINGS_PATH)) return {}
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'))
  } catch {
    return {}
  }
}

function hasDocutrackHooks(settings) {
  return settings?.hooks?.PostToolUse?.some(h =>
    h.hooks?.some(cmd => cmd.command?.includes('docutrack'))
  )
}

function installHooks() {
  const dir = path.dirname(SETTINGS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const settings = read()

  if (hasDocutrackHooks(settings)) return false // already installed

  if (!settings.hooks) settings.hooks = {}

  for (const [event, newEntries] of Object.entries(DOCUTRACK_HOOKS)) {
    if (!settings.hooks[event]) {
      settings.hooks[event] = newEntries
    } else {
      settings.hooks[event].push(...newEntries)
    }
  }

  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
  return true
}

module.exports = { read, installHooks, hasDocutrackHooks, SETTINGS_PATH }
