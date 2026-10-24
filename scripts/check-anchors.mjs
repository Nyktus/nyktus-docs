// SPDX-FileCopyrightText: The Nyktus Authors
// SPDX-License-Identifier: AGPL-3.0-or-later

// Checks every hash link in the Markdown sources against the ids of the built pages.
//
// VitePress reports dead page links at build time but not dead anchors: a renamed heading, or
// a slug that keeps a character the author did not expect (an em dash), turns `#anchor` into a
// link that silently lands at the top of the page. Runs after the build, so `.vitepress/dist`
// is current; covers `](#anchor)`, `](/path#anchor)` and relative `](page.md#anchor)` links.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'src')
const dist = join(root, '.vitepress/dist')

if (!existsSync(dist)) {
  console.error('check-anchors: .vitepress/dist is missing, run `npm run build` first')
  process.exit(1)
}

function markdownFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) markdownFiles(path, out)
    else if (entry.name.endsWith('.md')) out.push(path)
  }
  return out
}

// A stray '%' in an id or anchor must be reported as a mismatch, not crash the check.
function decode(s) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

const idCache = new Map()
function idsOf(htmlFile) {
  if (!idCache.has(htmlFile)) {
    if (!existsSync(htmlFile)) {
      idCache.set(htmlFile, null)
    } else {
      const html = readFileSync(htmlFile, 'utf8')
      const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => decode(m[1].replace(/&amp;/g, '&')))
      idCache.set(htmlFile, new Set(ids))
    }
  }
  return idCache.get(htmlFile)
}

let checked = 0
const broken = []
for (const file of markdownFiles(src)) {
  const page = relative(src, file).split('\\').join('/')
  // Code blocks and inline code show link syntax as examples; they are not links.
  const source = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
  for (const match of source.matchAll(/\]\(([^)\s]*#[^)\s]+)\)/g)) {
    const [target, anchor] = match[1].split('#')
    if (/^[a-z]+:/i.test(target)) continue

    let targetPage
    if (target === '') targetPage = page
    else if (target.startsWith('/')) targetPage = target.slice(1)
    else targetPage = posix.join(posix.dirname(page), target)
    targetPage = targetPage.replace(/\.(md|html)$/, '').replace(/\/$/, '/index').replace(/^$/, 'index')

    const ids = idsOf(join(dist, targetPage + '.html'))
    checked++
    if (ids === null) broken.push(`${page}: ${match[1]} -> page ${targetPage} not built`)
    else if (!ids.has(decode(anchor))) broken.push(`${page}: ${match[1]} -> no #${anchor} on ${targetPage}`)
  }
}

console.log(`check-anchors: ${checked} hash links checked, ${broken.length} broken`)
for (const line of broken) console.log('  ' + line)
process.exit(broken.length ? 1 : 0)
