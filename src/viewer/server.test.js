'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const DocuTrackServer = require('./server')

const s = new DocuTrackServer('/fake/root', 4242)

describe('moduleDocName', () => {
  it('drops leading src/ for shallow files', () => {
    assert.equal(s.moduleDocName('src/utils.ts'), 'utils')
  })

  it('uses last 2 segments for deeper paths', () => {
    assert.equal(s.moduleDocName('app/dashboard/SearchBar.tsx'), 'dashboard-SearchBar')
  })

  it('handles lib/ prefix', () => {
    assert.equal(s.moduleDocName('lib/rules-engine.ts'), 'rules-engine')
  })

  it('handles deeply nested paths', () => {
    assert.equal(s.moduleDocName('src/components/ui/Button.tsx'), 'ui-Button')
  })
})

describe('routeDocName', () => {
  it('converts simple route', () => {
    assert.equal(s.routeDocName('app/api/documentos/route.ts'), 'documentos')
  })

  it('strips dynamic segments brackets', () => {
    assert.equal(s.routeDocName('app/api/documentos/[id]/evaluar/route.ts'), 'documentos-id-evaluar')
  })

  it('handles nested api routes', () => {
    assert.equal(s.routeDocName('app/api/metricas/route.ts'), 'metricas')
  })
})

describe('fileToApiPath', () => {
  it('converts dynamic segments to OpenAPI params', () => {
    assert.equal(s.fileToApiPath('app/api/documentos/[id]/route.ts'), '/api/documentos/{id}')
  })

  it('handles simple routes', () => {
    assert.equal(s.fileToApiPath('app/api/status/route.ts'), '/api/status')
  })
})
