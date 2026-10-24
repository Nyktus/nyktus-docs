// SPDX-FileCopyrightText: The Nyktus Authors
// SPDX-License-Identifier: AGPL-3.0-or-later

// Copies the files that this site generates pages from out of the main repository, at the
// commit that `sync.json` pins, and records their hashes there.
//
//   node scripts/sync.mjs <checkout> [--ref <revision>] [--allow-unmerged]   copy the files
//   node scripts/sync.mjs --check                                            verify the copies
//
// The copies are committed, so that the site builds without a checkout of the main repository.
// `--check` runs in every build and fails when a copy differs from the hash it was recorded
// with, which catches an edit by hand. Files are read from the commit with `git show`, never from
// the working tree, so the result does not depend on what the checkout has open.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pinPath = join(root, 'sync.json')

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const git = (checkout, ...args) => execFileSync('git', ['-C', checkout, ...args], { maxBuffer: 64 * 1024 * 1024 })
const fail = (message) => {
  console.error(`sync: ${message}`)
  process.exit(1)
}

const pin = JSON.parse(readFileSync(pinPath, 'utf8'))
const args = process.argv.slice(2)

if (args.includes('--check')) {
  let drift = 0
  for (const [to, entry] of Object.entries(pin.files)) {
    const path = join(root, to)
    if (!existsSync(path)) {
      console.error(`sync: ${to} is missing`)
      drift++
    } else if (hash(readFileSync(path)) !== entry.sha256) {
      console.error(`sync: ${to} differs from the copy recorded in sync.json; run \`npm run sync -- <checkout>\``)
      drift++
    }
  }
  if (drift) process.exit(1)
  console.log(`sync: ${Object.keys(pin.files).length} copies match ${pin.repository}@${pin.ref.slice(0, 12)}`)
  process.exit(0)
}

const refAt = args.indexOf('--ref')
const revision = refAt === -1 ? pin.ref : args[refAt + 1]
const allowUnmerged = args.includes('--allow-unmerged')
const checkoutArg = args.find((arg, i) => !arg.startsWith('--') && (refAt === -1 || i !== refAt + 1))
if (!checkoutArg || !revision) fail('usage: sync.mjs <checkout> [--ref <revision>] [--allow-unmerged] | --check')
const checkout = resolve(checkoutArg)

let sha
try {
  sha = git(checkout, 'rev-parse', '--verify', `${revision}^{commit}`).toString().trim()
} catch {
  fail(`${revision} is not a commit of ${checkout}; fetch it first`)
}

// A pin on a commit that never reached main would document behavior that may not ship.
if (!allowUnmerged) {
  try {
    git(checkout, 'merge-base', '--is-ancestor', sha, 'origin/main')
  } catch {
    fail(`${sha.slice(0, 12)} is not on origin/main of the checkout; fetch it, or pass --allow-unmerged for a draft`)
  }
}

for (const [to, entry] of Object.entries(pin.files)) {
  let bytes
  try {
    bytes = git(checkout, 'show', `${sha}:${entry.source}`)
  } catch {
    fail(`${entry.source} does not exist at ${sha.slice(0, 12)}`)
  }
  mkdirSync(dirname(join(root, to)), { recursive: true })
  writeFileSync(join(root, to), bytes)
  entry.sha256 = hash(bytes)
  console.log(`sync: ${entry.source} -> ${to}`)
}

pin.ref = sha
writeFileSync(pinPath, JSON.stringify(pin, null, 2) + '\n')
console.log(`sync: pinned ${pin.repository}@${sha}`)
