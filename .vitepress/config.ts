// SPDX-FileCopyrightText: The Nyktus Authors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { defineConfig } from 'vitepress'
import { plateTheme } from './plate-theme'
import { loadSpec, tagPages } from '../scripts/openapi.mjs'

// The reference pages are generated from the specification, so the sidebar lists its tags.
const apiTags = tagPages(loadSpec())

// The guides and the security page share one sidebar. The security page keeps its address, because
// published URLs are permanent.
const guides = [
  {
    text: 'Decoys',
    items: [
      { text: 'Honeytokens', link: '/guides/honeytokens' },
      { text: 'DNS honeytokens', link: '/guides/dns-honeytokens' },
      { text: 'Report with a POST', link: '/guides/post-reports' },
      { text: 'Honeypots', link: '/guides/honeypots' },
      { text: 'Sensor', link: '/guides/sensor' },
      { text: 'Log forwarding', link: '/guides/log-forwarding' },
      { text: 'Cloud webhooks', link: '/guides/cloud-webhooks' },
    ],
  },
  {
    text: 'Stories',
    items: [
      { text: 'Scenarios', link: '/guides/scenarios' },
      { text: 'Deception catalog', link: '/guides/catalog' },
      { text: 'Catalog reference', link: '/guides/catalog-reference' },
    ],
  },
  {
    text: 'Detection',
    items: [
      { text: 'Incidents', link: '/guides/incidents' },
      { text: 'Alerting', link: '/guides/alerting' },
    ],
  },
  {
    text: 'Security',
    items: [{ text: 'Stealth considerations', link: '/security/stealth' }],
  },
]

// Pages that were removed or renamed. Published URLs are permanent, so each old path gets a small page
// that sends the reader on. A static host needs no server rules for it. Add a line here in the same
// change that moves a page.
const redirects: Record<string, string> = {
  '/guides/artifacts': '/guides/catalog#example-files',
}

// English is the root locale. To add a language:
//   1. Add its entry to `locales` below, with its own `link`, `themeConfig.nav` and `sidebar`.
//   2. Put its pages in a folder of the same name under `src/`, with the same paths as the
//      English pages, so that the language switcher lands on the translated page.
//   3. Add the locale to the search `locales` further down.
// Published URLs are permanent: move a page only together with a redirect.
export default defineConfig({
  title: 'Nyktus Docs',
  description: 'Documentation of Nyktus, a self-hosted platform for honeytokens and honeypots.',

  srcDir: 'src',
  cleanUrls: true,
  lastUpdated: true,

  buildEnd(siteConfig) {
    for (const [from, to] of Object.entries(redirects)) {
      const page = join(siteConfig.outDir, `${from}.html`)
      mkdirSync(dirname(page), { recursive: true })
      const canonical = `https://docs.nyktus.org${to.split('#')[0]}`
      writeFileSync(
        page,
        `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>This page has moved</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${canonical}">
<meta http-equiv="refresh" content="0; url=${to}">
</head>
<body>
<p>This page has moved to <a href="${to}">${canonical}</a>.</p>
</body>
</html>
`,
      )
    }
  },

  // Lets search engines find every page of docs.nyktus.org.
  sitemap: { hostname: 'https://docs.nyktus.org' },

  // One light theme: the plates for code are dark in both cases.
  appearance: false,

  locales: {
    root: {
      label: 'English',
      lang: 'en',
    },
  },

  themeConfig: {
    logo: { src: '/nyktus-mark.svg', alt: '' },
    siteTitle: 'Nyktus',

    nav: [
      { text: 'Getting started', link: '/getting-started/introduction', activeMatch: '/getting-started/' },
      { text: 'Guides', link: '/guides/honeytokens', activeMatch: '/guides/|/security/' },
      { text: 'Operate', link: '/operate/deploy', activeMatch: '/operate/' },
      { text: 'API reference', link: '/api/', activeMatch: '/api/' },
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting started',
          items: [
            { text: 'What Nyktus does', link: '/getting-started/introduction' },
            { text: 'Concepts', link: '/getting-started/concepts' },
            { text: 'Architecture', link: '/getting-started/architecture' },
            { text: 'Quickstart', link: '/getting-started/quickstart' },
          ],
        },
      ],
      '/guides/': guides,
      '/security/': guides,
      '/operate/': [
        {
          text: 'Install',
          items: [
            { text: 'Deploy', link: '/operate/deploy' },
            { text: 'Database setup', link: '/operate/database' },
            { text: 'First start', link: '/operate/first-start' },
            { text: 'Reverse proxy', link: '/operate/reverse-proxy' },
          ],
        },
        {
          text: 'Run',
          items: [
            { text: 'Configuration', link: '/operate/configuration' },
            { text: 'Sign-in and sessions', link: '/operate/sign-in' },
            { text: 'Accounts', link: '/operate/users' },
            { text: 'Roles and permissions', link: '/operate/permissions' },
          ],
        },
        {
          text: 'Observe',
          items: [
            { text: 'Audit log', link: '/operate/audit-log' },
            { text: 'Logs', link: '/operate/logs' },
            { text: 'Metrics', link: '/operate/metrics' },
          ],
        },
        {
          text: 'Secure',
          items: [{ text: 'Hardening checklist', link: '/operate/hardening' }],
        },
      ],
      '/api/': [
        {
          text: 'API reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Authentication', link: '/api/authentication' },
          ],
        },
        {
          text: 'Operations',
          items: apiTags.map((tag) => ({ text: tag.title, link: tag.link })),
        },
      ],
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/Nyktus/nyktus-docs/edit/main/src/:path',
      text: 'Suggest a change to this page',
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/Nyktus/nyktus' }],

    footer: {
      message:
        'Text under CC BY-SA 4.0. MITRE, ATT&CK and MITRE Engage are trademarks of The MITRE Corporation; Nyktus is not affiliated with or endorsed by MITRE. Typefaces: <a href="/licenses/OFL-SchibstedGrotesk.txt">Schibsted Grotesk</a> and <a href="/licenses/OFL-JetBrainsMono.txt">JetBrains Mono</a> under the SIL Open Font License.',
      copyright: 'Copyright © The Nyktus Authors',
    },
  },

  // Nothing is loaded from another origin at runtime, the same promise that Nyktus makes.
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#eef1ef' }],
  ],

  markdown: {
    lineNumbers: false,
    theme: plateTheme,
  },
})
