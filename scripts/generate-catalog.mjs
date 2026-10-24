// SPDX-FileCopyrightText: The Nyktus Authors
// SPDX-License-Identifier: AGPL-3.0-or-later

// Writes the catalog reference page from the published catalog file, and publishes the file
// itself at /deception-catalog.json for readers that cannot reach the API of an installation. Both
// are build output and not committed.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { escapeText } from './openapi.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'data/deception-catalog.json')
const catalog = JSON.parse(readFileSync(source, 'utf8'))
if (catalog.schema_version !== 1) throw new Error(`generate-catalog: unknown schema version ${catalog.schema_version}`)

const code = (value) => '`' + value + '`'
const cell = (text) => escapeText(String(text ?? '')).replace(/\s+/g, ' ').replace(/\|/g, '\\|')

const techniqueLink = (id) => `[${id}](https://attack.mitre.org/techniques/${id.replace('.', '/')}/)`
const activityLink = (id) => `[${id}](https://engage.mitre.org/activities/${id}/)`
const techniques = (ids) => (ids.length ? ids.map((id) => `${techniqueLink(id)} ${cell(catalog.techniques[id]?.name ?? '')}`.trim()).join('<br>') : '')
const activities = (ids) => ids.map((id) => `${activityLink(id)} ${cell(catalog.engage_activities[id]?.name ?? '')}`.trim()).join('<br>')

const deceptions = catalog.deceptions.en
const out = []
out.push(
  '---',
  'title: Catalog reference',
  'description: Every deception of the Nyktus catalog, with the honeytokens it creates, the values it asks for and the files it renders.',
  'outline: [2, 2]',
  'editLink: false',
  'lastUpdated: false',
  '---',
  '',
  '# Catalog reference',
  '',
  `The deceptions that ship with Nyktus, in the language \`en\`. This page is generated from the published catalog file, version ${code(catalog.schema_version)} of its format, which uses MITRE ATT&CK ${catalog.attack_version} and MITRE Engage ${catalog.engage_version}. [How to apply a deception](/guides/catalog#apply-a-deception) is described in the guide. The file itself is at [/deception-catalog.json](/deception-catalog.json), with the German texts, for readers that do not reach the API of an installation.`,
  '',
  '| Deception | Category | Summary |',
  '|---|---|---|',
)
for (const d of deceptions) out.push(`| [${cell(d.title)}](#${d.id}) | ${d.category} | ${cell(d.summary)} |`)
out.push('')

for (const d of deceptions) {
  out.push(`## ${escapeText(d.title)} {#${d.id}}`, '', `${code(d.id)} · ${d.category}`, '', escapeText(d.summary), '')
  out.push(`**Techniques:** ${techniques(d.techniques).replaceAll('<br>', ', ') || 'none'}  `)
  out.push(`**Engage activities:** ${activities(d.engage_activities).replaceAll('<br>', ', ') || 'none'}`, '')
  if (d.honeytokens.length) {
    out.push('**Honeytokens it creates**', '', '| Label | Type | Severity | Techniques |', '|---|---|---|---|')
    for (const h of d.honeytokens) out.push(`| ${cell(h.label)} | ${code(h.type)} | ${h.severity} | ${techniques(h.techniques)} |`)
    out.push('')
  }
  if (d.persona.length) {
    out.push('**Values it asks for**', '', '| Key | Kind | Label | Example |', '|---|---|---|---|')
    for (const p of d.persona) out.push(`| ${code(p.key)} | ${p.kind} | ${cell(p.label)} | ${code(cell(p.example))} |`)
    out.push('')
  }
  if (d.secrets.length) out.push(`**Secrets it generates:** ${d.secrets.map((s) => `${code(s.key)} (${s.length} characters)`).join(', ')}`, '')
  if (d.artifacts.length) {
    out.push('**Files it renders**', '', '| File | Format |', '|---|---|')
    for (const a of d.artifacts) out.push(`| ${code(a.file_name)} | ${code(a.format)} |`)
    out.push('')
  } else {
    out.push('It renders no file. Its guide tells you what to create.', '')
  }
}

out.push('## Techniques and activities', '', '| Identifier | Name |', '|---|---|')
for (const [id, t] of Object.entries(catalog.techniques)) out.push(`| ${techniqueLink(id)} | ${cell(t.name)} |`)
for (const [id, a] of Object.entries(catalog.engage_activities)) out.push(`| ${activityLink(id)} | ${cell(a.name)} |`)
out.push('', '## License and notices', '', ...catalog.notice.map((n) => `${escapeText(n)}\n`))

mkdirSync(join(root, 'src/guides'), { recursive: true })
writeFileSync(join(root, 'src/guides/catalog-reference.md'), out.join('\n') + '\n')
mkdirSync(join(root, 'src/public'), { recursive: true })
copyFileSync(source, join(root, 'src/public/deception-catalog.json'))
console.log(`generate-catalog: ${deceptions.length} deceptions`)
