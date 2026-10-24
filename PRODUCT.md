# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

VitePress 1.6.4, static output, Markdown pages in `src/`, a custom theme on top of the default theme in `.vitepress/theme/`. Hosting for docs.nyktus.org is undecided.

## Users

**Primary:** the operator of a Nyktus installation: IT and security leads at organisations without their own security operations center (Mittelstand, operators subject to NIS2 or close to KRITIS, managed service providers). They install, configure and run Nyktus, place decoys and handle the alerts. They read documentation to get something done, usually with a terminal open beside it, and many know honeypots but not honeytokens.

**Secondary:** integrators who connect Nyktus to a SIEM, a chat tool or a CI/CD pipeline through its API; analysts who triage incidents; contributors who read how the parts fit together. The documentation serves them from the second level of navigation, not from the front page.

## Product Purpose

The documentation of Nyktus (docs.nyktus.org), an open-source, self-hosted cyber deception platform. It exists so that an operator reaches a working installation and a first decoy quickly, understands what each part does and what it cannot do, and finds exact facts (configuration, limits, API) without asking anyone. Success: the operator completes the quickstart from the page alone, and later finds a limit, a default or an error cause in under a minute.

## Positioning

Documentation that states limits as plainly as capabilities. It covers what the interface cannot explain: decisions that belong to the operator, defaults, limits, failure modes, and what an intruder can observe of the setup (the stealth considerations). It leaves out what the interface explains itself.

## Operating Context

- Read next to a terminal or an editor: code is copied, compared and adapted.
- The reader may come from the web console, which links to this site from every page.
- Search and deep links matter more than the front page. Published URLs are permanent.
- The pages go live together with the first tagged release of Nyktus. Until then the project is in early development and not ready for production use.

## Capabilities and Constraints

- Sections: Getting started, Guides, Security (stealth considerations), Operate, API reference.
- English first; the structure allows further languages, German first.
- The API reference is generated from `api/openapi.yaml` of the main repository; the deception catalog reference from the published catalog file.
- The site loads nothing from another origin at runtime: no CDN, no web fonts, no analytics, no embedded third-party content. Fonts are bundled by the build.
- Terminology: "honeytoken" is the term. "Canary token" does not appear.
- Wherever MITRE is named, the trademark notice stands in the footer; nothing suggests a partnership or endorsement.
- Examples use reserved example domains and documentation addresses, never live hosts, keys or tokens.
- Undecided: hosting and redirects, installation instructions before the first release (no images or packages exist yet), the second language.

## Brand Commitments

Name **Nyktus**, domain nyktus.org, GitHub organisation `Nyktus`. The visual world is that of the landing page (The Quiet Network: silver ground, near-black ink, one light mint used as a signal, forest green for links). Voice: sober, precise, honest about limits; no fear marketing, no hype. Text is licensed under CC BY-SA 4.0, the code that builds the site under AGPL-3.0-or-later.

## Evidence on Hand

- The user documentation of the main repository (`docs/operations/`), the OpenAPI specification and the published catalog file.
- The landing page's PRODUCT.md and DESIGN.md.
- No customers, testimonials, logos, benchmarks or usage numbers exist. None may be invented, and the pages make no numeric claims about effectiveness. Illustrative events, logs and payloads are labelled as example data.

## Product Principles

1. **Practise what the product preaches.** The site is self-contained, private and verifiable, like Nyktus.
2. **Say what the reader cannot see.** Document decisions, limits and failure modes; skip what the interface explains.
3. **Run it before you write it.** Every command in a page was run, and every statement is checked against the code.
4. **Honest about limits.** State what Nyktus cannot detect, what concealment cannot hide, and what compliance it does not grant.
5. **The reader's task leads.** Sections follow what an operator does, not the structure of the code.

## Accessibility & Inclusion

WCAG 2.2 AA. Keyboard-complete navigation and search, visible focus, no information carried by colour alone, readable at 200% zoom and on a phone. English text is plain: short sentences, defined terms, no idioms that machine translation breaks.
