'use strict'

const path = require('path')

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']

// Matches: (app|router|server|this).(method)('path' or "path" or `path`)
const ROUTE_RE = /(?:app|router|server|this|fastify|koa)\s*\.\s*(get|post|put|patch|delete|options|head)\s*\(\s*[`'"](\/[^`'"]*)[`'"]/gi

// Matches: .route('/path').get(h).post(h)...
const ROUTE_CHAIN_PATH_RE = /\.route\s*\(\s*[`'"](\/[^`'"]*)[`'"]\s*\)/g
const ROUTE_CHAIN_METHOD_RE = /\.\s*(get|post|put|patch|delete|options|head)\s*\(/gi

function parse(filePath, content) {
  const tag = inferTag(filePath)
  const routes = []
  const seen = new Set()

  // Standard method routes
  let m
  const re = new RegExp(ROUTE_RE.source, 'gi')
  while ((m = re.exec(content)) !== null) {
    const method = m[1].toUpperCase()
    const rawPath = m[2]
    const opPath = toOpenApiPath(rawPath)
    const key = `${method}:${opPath}`
    if (!seen.has(key)) {
      seen.add(key)
      routes.push(makeRoute(method, opPath, tag))
    }
  }

  // .route('/path').get().post() chains
  const chainRe = new RegExp(ROUTE_CHAIN_PATH_RE.source, 'g')
  while ((m = chainRe.exec(content)) !== null) {
    const opPath = toOpenApiPath(m[1])
    // Grab the segment after this .route(...) match and find chained methods
    const segment = content.slice(m.index + m[0].length, m.index + m[0].length + 200)
    const methodRe = new RegExp(ROUTE_CHAIN_METHOD_RE.source, 'g')
    let mm
    while ((mm = methodRe.exec(segment)) !== null) {
      const method = mm[1].toUpperCase()
      if (!HTTP_METHODS.includes(method.toLowerCase())) continue
      const key = `${method}:${opPath}`
      if (!seen.has(key)) {
        seen.add(key)
        routes.push(makeRoute(method, opPath, tag))
      }
    }
  }

  return routes
}

function makeRoute(method, opPath, tag) {
  const params = extractPathParams(opPath)
  const route = {
    method,
    path: opPath,
    tag,
    summary: '',
    operationId: toOperationId(method, opPath),
    parameters: params.map(p => ({
      name: p,
      in: 'path',
      required: true,
      schema: { type: 'string' },
    })),
    responses: { '200': { description: 'OK' } },
  }
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    route.requestBody = {
      content: { 'application/json': { schema: { type: 'object' } } },
    }
  }
  return route
}

function toOpenApiPath(expressPath) {
  return expressPath.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}')
}

function extractPathParams(openApiPath) {
  const params = []
  const re = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g
  let m
  while ((m = re.exec(openApiPath)) !== null) params.push(m[1])
  return params
}

function inferTag(filePath) {
  const base = path.basename(filePath, path.extname(filePath))
  return base
    .replace(/\.routes?$/, '').replace(/\.controller$/, '').replace(/\.handler$/, '')
    .replace(/[-_]/g, ' ')
    .split(' ')[0]
    .toLowerCase()
}

function toOperationId(method, opPath) {
  const parts = opPath
    .replace(/\{([^}]+)\}/g, (_, name) => 'By' + name.charAt(0).toUpperCase() + name.slice(1))
    .replace(/^\//, '').split('/')
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
  return method.toLowerCase() + (parts || 'Root')
}

module.exports = { parse }
