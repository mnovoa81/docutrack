'use strict'

const fs = require('fs')
const { clear, pendingCount } = require('../utils/queue')

async function run() {
  if (!fs.existsSync('.docutrack')) {
    console.log('\nDocuTrack is not initialized. Run "npx docutrack init" first.\n')
    process.exit(1)
  }

  const before = pendingCount()
  clear()
  console.log(`\nQueue cleared. Removed ${before} pending item(s).\n`)
}

module.exports = { run }
