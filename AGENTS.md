# AGENTS.md

Instructions for coding agents working in this repository. Human contributors start with [CONTRIBUTING.md](CONTRIBUTING.md).

## Project

The documentation site of [Nyktus](https://github.com/Nyktus/nyktus) at docs.nyktus.org. Nyktus is a self-hosted deception platform: honeytokens, honeypots and artifacts, grouped into scenarios, built from a deception catalog mapped to MITRE ATT&CK and MITRE Engage. It is a security product, and the documentation is part of it: a wrong or careless sentence leads to an insecure installation.

The documentation is English only. The structure allows more languages, see the comment in `.vitepress/config.ts`.

## Stack

| Component | Technology |
|---|---|
| Site | VitePress, static output |
| Pages | Markdown in `src/` |
| Fonts | Fontsource packages, bundled by the build |
| API reference | Generated at build time from `data/openapi.yaml` by `scripts/generate-api.mjs` |
| Checks | `scripts/check-anchors.mjs` and `npm run check:sync` in every build |

Nothing is loaded from another origin at runtime: no CDN, no web fonts, no analytics, no embedded third-party content. Nyktus makes the same promise and the documentation keeps it.

## Repository layout

```
src/                pages; one folder per section
src/public/         files that are served as they are
src/api/reference/  generated pages of the API reference; not committed
data/               copies of files of the main repository, see "Source of truth"
sync.json           the commit of the main repository that the copies come from, and their hashes
.vitepress/         site configuration and theme
scripts/            checks and generators, run by developers and the CI, never in the browser
```

Directories are created when their first file lands. Do not add placeholder files.

## Source of truth

Nyktus is the source of truth for its behavior. Read the code, the OpenAPI specification and the guidelines in `docs/development/` of the main repository before you write a statement about it, and run what you document. Do not copy a statement from older documentation without checking it against the code. A statement you cannot verify does not go into a page; write it down as an open question in the pull request instead.

- `api/openapi.yaml` is the only source for the endpoints of the API. Pages link to the reference and do not repeat it.
- The deception catalog reference is generated from the published catalog file. Do not write it by hand.
- The copies in `data/` come from the main repository at the commit that `sync.json` pins. Update them with `npm run sync -- <checkout>`, optionally with `--ref <revision>` to move the pin; the commit must be on `origin/main` of the checkout. Do not edit a copy: the build fails when it differs from its recorded hash. An error in the specification is fixed in the main repository.
- A description in the API reference is the text of the specification. To improve it, change the specification there, not the generator here.

## Writing rules

Every page serves one reader and one goal. Decide both before you write, and name the type of the page: tutorial (a guided first success), how-to guide (a task for a reader who knows the basics), reference (facts to look up) or explanation (why it works this way). Do not mix types on one page; split it and link.

- **Lead with the outcome.** The first paragraph says what the reader can do after the page. Background comes after it or on another page.
- **Document what the reader cannot see.** Do not explain what the interface explains itself: forms, buttons, enabling a second factor, changing a password. Document limits, defaults, side effects, failure modes, and the decisions that are the operator's.
- **Every instruction has an example that works.** Run each command and paste its real output. Use realistic values, not `string` or `foo`. Mark placeholders consistently, such as `<console-url>`, and say what to replace. Show the expected result after a command.
- **Say what happens when it goes wrong.** Document the error responses a reader meets, with their cause and the fix, not only the success.
- **State conditions before actions.** "If the database is on another host, set ..." not "Set ..., if the database is on another host."
- Active voice, imperative for steps, short sentences. Define a term on first use. No "simply", "just", "easy" or "obviously".
- Use the terms of the domain language and one term per concept. Write "honeytoken", never "canary token".
- Link text names the target: "see [the trigger address](...)", not "click here".
- Admonitions sparingly, and only for a danger or a prerequisite the reader would otherwise miss.
- Keep a page short enough to read in one sitting. Split before a page needs more than three levels of headings.
- Edit in passes: structure, cuts, sentences, words, consistency, then accuracy. Cut a third of the first draft. Do not rewrite quotations, code, error messages or labels of the interface.

Published URLs are permanent. When a page moves or is renamed, add a redirect from the old path in the same change.

## Security of the documentation

- Examples use reserved names: `example.com`, `example.net`, `example.org` and documentation addresses (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32`). Never a real host, address, key or token, and never a string that looks like a live secret. Use an obvious fake, such as `nyk_example_...`, so that secret scanners stay quiet.
- Do not advise a setting that weakens one of the invariants of Nyktus: trigger endpoints that answer differently by outcome, secrets that are logged or shown twice, requests to user-supplied URLs that skip the guarded client, a console reachable from the monitored network. If a page needs such an exception, say what it costs.
- A page about concealment (what an attacker can see) states what is observable and what raises the effort. It promises no invisibility.
- MITRE data: name MITRE ATT&CK and MITRE Engage with the trademark notice that `NOTICE` keeps. Do not imply a partnership.

## Working rules

- Keep changes within the scope of the task. Report unrelated problems instead of fixing them on the side.
- Do not add a dependency without asking. Explain why VitePress and the standard library are not enough. Packages must be at least seven days old (`min-release-age` in `.npmrc`); do not use `npx`.
- Every new source file of code starts with the SPDX header that `.vitepress/config.ts` shows. Pages do not carry one.
- Comments in code explain *why*, in English. No history, no ticket identifiers, no commented-out code.
- Commits follow Conventional Commits and carry a DCO sign-off (`git commit -s`).
- Do not commit secrets, `.env` files or generated build output.
- `.localdev/` contains private planning notes. It is not part of the repository. Never reference it from tracked files.

## Commands

| Command | Purpose |
|---|---|
| `npm ci` | Install the packages exactly as locked |
| `npm run dev` | Generate the API pages, then start the development server with live reload |
| `npm run build` | Check the copies, generate the API pages, build strictly, then check the hash links |
| `npm run sync -- <checkout>` | Copy the pinned files from a checkout of the main repository |
| `npm run generate` | Write the pages of the API reference |
| `npm run preview` | Serve the production build |
| `npm audit --audit-level=high` | Report known vulnerabilities in the packages |

Run `npm run build` before you consider a change complete. The build fails on a broken link or anchor.
