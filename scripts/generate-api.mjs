// SPDX-FileCopyrightText: The Nyktus Authors
// SPDX-License-Identifier: AGPL-3.0-or-later

// Writes the pages of the API reference to src/api/reference/, one for each tag of the
// specification. The pages are build output: they are not committed, and `npm run build` and
// `npm run dev` write them first.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSpec, renderTagPage } from './openapi.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'src/api/reference')
const pin = JSON.parse(readFileSync(join(root, 'sync.json'), 'utf8'))
const spec = loadSpec()

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

const tagged = new Set()
for (const item of Object.values(spec.paths)) {
  for (const operation of Object.values(item)) {
    if (operation?.tags) operation.tags.forEach((t) => tagged.add(t))
  }
}
for (const tag of spec.tags) {
  if (!tagged.has(tag.name)) throw new Error(`generate-api: the tag ${tag.name} has no operation`)
  writeFileSync(join(out, `${tag.name}.md`), renderTagPage(spec, tag, pin))
}
// An operation under a tag that the specification does not declare would have no page.
for (const t of tagged) {
  if (!spec.tags.some((tag) => tag.name === t)) throw new Error(`generate-api: the tag ${t} is not declared`)
}

console.log(`generate-api: ${spec.tags.length} pages from ${Object.keys(spec.paths).length} paths`)
