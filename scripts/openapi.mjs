// SPDX-FileCopyrightText: The Nyktus Authors
// SPDX-License-Identifier: AGPL-3.0-or-later

// Reads the OpenAPI specification and renders the pages of the API reference from it. The
// specification is the only source for an endpoint: nothing here adds a fact to it, and a
// description is shown as written.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

export function loadSpec() {
  return parse(readFileSync(join(root, 'data/openapi.yaml'), 'utf8'))
}

const methods = ['get', 'put', 'post', 'patch', 'delete']

const tagTitles = {
  'api-keys': 'API keys',
  alerting: 'Alert channels',
  audit: 'Audit log',
  catalog: 'Deception catalog',
}

export function tagTitle(name) {
  if (tagTitles[name]) return tagTitles[name]
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ')
}

export function tagLink(name) {
  return `/api/reference/${name}`
}

// Tags of the specification that get no page, because their operations serve the web console and
// give an API client nothing to act on.
export const unlistedTags = new Set(['session'])

// The tags with a page in alphabetical order of their titles, each with the title and the link of its page.
export function tagPages(spec) {
  return spec.tags
    .filter((tag) => !unlistedTags.has(tag.name))
    .map((tag) => ({ name: tag.name, title: tagTitle(tag.name), description: tag.description, link: tagLink(tag.name) }))
    .sort((a, b) => a.title.localeCompare(b.title, 'en'))
}

function deref(spec, node) {
  let seen = 0
  while (node && node.$ref) {
    if (++seen > 20) throw new Error(`reference loop at ${node.$ref}`)
    node = node.$ref
      .replace(/^#\//, '')
      .split('/')
      .reduce((value, key) => value?.[key], spec)
    if (node === undefined) throw new Error('unresolved reference')
  }
  return node
}

// Text for a Markdown page that Vue compiles: braces and angle brackets outside code would be read
// as interpolation or as HTML. Code spans and fenced blocks stay as they are.
export function escapeText(text) {
  let fenced = false
  return text
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) {
        fenced = !fenced
        return line
      }
      if (fenced) return line
      return line
        .split(/(`[^`]*`)/)
        .map((part, i) => (i % 2 === 1 ? part : part.replace(/<(?=[a-zA-Z/!])/g, '&lt;').replace(/\{\{/g, '&#123;&#123;')))
        .join('')
    })
    .join('\n')
}

// A table cell holds one line, and a pipe ends it even inside a code span.
function cell(text) {
  return escapeText(String(text ?? '').trim())
    .replace(/\s+/g, ' ')
    .replace(/\|/g, '\\|')
}

const code = (value) => '`' + String(value) + '`'

function typeLabel(spec, schema) {
  const s = deref(spec, schema)
  const types = Array.isArray(s.type) ? s.type : s.type ? [s.type] : []
  const nullable = types.includes('null')
  const main = types.filter((t) => t !== 'null')
  let label
  if (s.oneOf || s.anyOf) label = 'one of several'
  else if (main.length === 1 && main[0] === 'array') label = `array of ${s.items ? typeLabel(spec, s.items) : 'values'}`
  else if (main.length) label = main.join(' or ')
  else if (s.properties) label = 'object'
  else label = 'any'
  if (s.format && main[0] === 'string') label += ` (${s.format})`
  return nullable ? `${label} or null` : label
}

function constraints(spec, schema) {
  const s = deref(spec, schema)
  const out = []
  if (s.const !== undefined) out.push(`Always ${code(s.const)}.`)
  if (s.enum) out.push(`One of ${s.enum.map(code).join(', ')}.`)
  if (s.minLength !== undefined || s.maxLength !== undefined) {
    out.push(`${s.minLength ?? 0} to ${s.maxLength ?? 'any number of'} characters.`)
  }
  if (s.minimum !== undefined || s.maximum !== undefined) {
    out.push(`${s.minimum ?? 'Any'} to ${s.maximum ?? 'any'}.`)
  }
  if (s.minItems !== undefined || s.maxItems !== undefined) {
    out.push(`${s.minItems ?? 0} to ${s.maxItems ?? 'any number of'} items.`)
  }
  if (s.pattern) out.push(`Matches ${code(s.pattern)}.`)
  if (s.default !== undefined) out.push(`Default ${code(JSON.stringify(s.default))}.`)
  const items = s.items && deref(spec, s.items)
  if (items?.enum) out.push(`Each is one of ${items.enum.map(code).join(', ')}.`)
  return out
}

// The fields of a schema as table rows, with nested objects and arrays of objects flattened into
// dotted paths.
function fieldRows(spec, schema, prefix = '', depth = 0) {
  const s = deref(spec, schema)
  const properties = { ...(s.properties ?? {}) }
  const required = new Set(s.required ?? [])
  for (const part of s.allOf ?? []) {
    const p = deref(spec, part)
    Object.assign(properties, p.properties ?? {})
    for (const key of p.required ?? []) required.add(key)
  }
  const rows = []
  for (const [key, property] of Object.entries(properties)) {
    const p = deref(spec, property)
    const description = [p.description ?? property.description ?? '', ...constraints(spec, property)].join(' ').trim()
    rows.push({ name: prefix + key, type: typeLabel(spec, property), required: required.has(key), description })
    if (depth >= 4) continue
    const nested = p.type === 'array' && p.items ? deref(spec, p.items) : p
    if (nested.properties || nested.allOf) {
      rows.push(...fieldRows(spec, nested, `${prefix}${key}${p.type === 'array' ? '[]' : ''}.`, depth + 1))
    }
  }
  if (s.additionalProperties && typeof s.additionalProperties === 'object') {
    rows.push({ name: `${prefix}<key>`, type: typeLabel(spec, s.additionalProperties), required: false, description: s.additionalProperties.description ?? '' })
  }
  return rows
}

function fieldTable(rows) {
  const lines = ['| Field | Type | Required | Description |', '|---|---|---|---|']
  for (const r of rows) {
    lines.push(`| ${code(r.name)} | ${cell(r.type)} | ${r.required ? 'yes' : 'no'} | ${cell(r.description)} |`)
  }
  return lines.join('\n')
}

// A value for a field of a request that shows its shape. The specification's own example wins;
// otherwise an enum, a constant or a default, otherwise a placeholder in angle brackets.
function sample(spec, schema, name, depth = 0) {
  const s = deref(spec, schema)
  if (s.example !== undefined) return s.example
  if (s.examples?.length) return s.examples[0]
  if (s.const !== undefined) return s.const
  if (s.enum) return s.enum[0]
  if (s.default !== undefined) return s.default
  const type = Array.isArray(s.type) ? s.type.find((t) => t !== 'null') : s.type
  if (type === 'boolean') return false
  if (type === 'integer' || type === 'number') return s.minimum ?? 0
  if (type === 'array') return depth > 3 || !s.items ? [] : [sample(spec, s.items, name, depth + 1)]
  if (type === 'object' || s.properties || s.allOf) {
    const out = {}
    const fields = fieldSources(spec, s)
    for (const key of fields.required) if (fields.properties[key]) out[key] = sample(spec, fields.properties[key], key, depth + 1)
    return out
  }
  if (s.format === 'date-time') return '2027-01-31T00:00:00Z'
  if (s.format === 'email') return 'user@example.com'
  return `<${name}>`
}

function fieldSources(spec, schema) {
  const s = deref(spec, schema)
  const properties = { ...(s.properties ?? {}) }
  const required = new Set(s.required ?? [])
  for (const part of s.allOf ?? []) {
    const p = deref(spec, part)
    Object.assign(properties, p.properties ?? {})
    for (const key of p.required ?? []) required.add(key)
  }
  return { properties, required: [...required] }
}

function accessText(operation) {
  const access = operation['x-access']
  const keyAllowed = (operation.security ?? []).some((requirement) => 'bearerKey' in requirement)
  const noCredentials = Array.isArray(operation.security) && operation.security.length === 0
  if (access === 'public') return 'Public. No authentication.'
  if (access === 'authenticated') {
    return keyAllowed ? 'Any signed-in user or API key.' : 'Any signed-in user. API keys receive `403`.'
  }
  const permission = `Permission ${code(access)}.`
  if (noCredentials) return permission
  return keyAllowed ? `${permission} An API key needs the scope of the same name.` : `${permission} Session only; API keys receive \`403\`.`
}

function curl(spec, path, method, operation) {
  const url = path.replace(/\{([^}]+)\}/g, '<$1>')
  const lines = [`curl --fail-with-body --request ${method.toUpperCase()} "<console-url>${url}"`]
  const keyAllowed = (operation.security ?? []).some((requirement) => 'bearerKey' in requirement)
  const isPublic = operation['x-access'] === 'public'
  if (!isPublic) lines.push(keyAllowed ? '--header "Authorization: Bearer $NYKTUS_API_KEY"' : '--cookie cookies.txt')
  const media = operation.requestBody && deref(spec, operation.requestBody).content?.['application/json']
  if (media?.schema) {
    const body = media.example ?? sample(spec, media.schema, 'body')
    lines.push('--header "Content-Type: application/json"')
    lines.push(`--data '${JSON.stringify(body, null, 2)}'`)
  }
  return '```sh\n' + lines.join(' \\\n  ') + '\n```'
}

function responseSection(spec, operation) {
  const lines = ['| Status | Meaning |', '|---|---|']
  let body = null
  for (const [status, response] of Object.entries(operation.responses)) {
    const r = deref(spec, response)
    lines.push(`| ${code(status)} | ${cell(r.description)} |`)
    if (!body && /^2/.test(status)) {
      const media = r.content?.['application/json']
      if (media?.schema) body = { status, media }
    }
  }
  const out = [lines.join('\n')]
  if (body) {
    const rows = fieldRows(spec, body.media.schema)
    if (rows.length) out.push(`**Response body** (${code(body.status)})\n\n${fieldTable(rows)}`)
    const example = body.media.example ?? Object.values(body.media.examples ?? {})[0]?.value
    if (example !== undefined) out.push('```json\n' + JSON.stringify(example, null, 2) + '\n```')
  }
  return out.join('\n\n')
}

function operationSection(spec, path, method, operation, pathParameters) {
  const parameters = [...pathParameters, ...(operation.parameters ?? [])].map((p) => deref(spec, p))
  const out = [`## ${escapeText(operation.summary)} {#${operation.operationId}}`]
  out.push(`${code(method.toUpperCase())} ${code(path)}`)
  out.push(`**Access:** ${accessText(operation)}`)
  if (operation.description) out.push(escapeText(operation.description.trim()))
  if (parameters.length) {
    const lines = ['**Parameters**', '', '| Name | In | Required | Description |', '|---|---|---|---|']
    for (const p of parameters) {
      const description = [p.description ?? '', ...constraints(spec, p.schema ?? {})].join(' ').trim()
      lines.push(`| ${code(p.name)} | ${p.in} | ${p.required || p.in === 'path' ? 'yes' : 'no'} | ${cell(description)} |`)
    }
    out.push(lines.join('\n'))
  }
  const requestBody = operation.requestBody && deref(spec, operation.requestBody)
  const media = requestBody?.content?.['application/json']
  if (media?.schema) {
    out.push(`**Request body**${requestBody.required ? '' : ' (optional)'}\n\n${fieldTable(fieldRows(spec, media.schema))}`)
  }
  out.push('**Example**\n\n' + curl(spec, path, method, operation))
  out.push('**Responses**\n\n' + responseSection(spec, operation))
  return out.join('\n\n')
}

// The Markdown page of one tag.
export function renderTagPage(spec, tag) {
  const title = tagTitle(tag.name)
  const sections = []
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of methods) {
      const operation = item[method]
      if (operation?.tags?.includes(tag.name)) {
        sections.push(operationSection(spec, path, method, operation, item.parameters ?? []))
      }
    }
  }
  const header = [
    '---',
    `title: ${title}`,
    `description: ${JSON.stringify(tag.description)}`,
    'outline: [2, 2]',
    'editLink: false',
    'lastUpdated: false',
    '---',
    '',
    `# ${title}`,
    '',
    escapeText(tag.description),
    '',
  ]
  return header.join('\n') + '\n' + sections.join('\n\n') + '\n'
}
