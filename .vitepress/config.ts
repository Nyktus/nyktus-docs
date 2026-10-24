// SPDX-FileCopyrightText: The Nyktus Authors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { defineConfig } from 'vitepress'
import { plateTheme } from './plate-theme'
import { loadSpec, tagPages } from '../scripts/openapi.mjs'

// The reference pages are generated from the specification, so the sidebar lists its tags.
const apiTags = tagPages(loadSpec())

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
      { text: 'Guides', link: '/guides/honeytokens', activeMatch: '/guides/' },
      { text: 'Operate', link: '/operate/database', activeMatch: '/operate/' },
      { text: 'Security', link: '/security/stealth', activeMatch: '/security/' },
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
      '/guides/': [
        {
          text: 'Decoys',
          items: [
            { text: 'Honeytokens', link: '/guides/honeytokens' },
            { text: 'DNS honeytokens', link: '/guides/dns-honeytokens' },
            { text: 'Honeypots', link: '/guides/honeypots' },
            { text: 'Sensor', link: '/guides/sensor' },
          ],
        },
        {
          text: 'Stories',
          items: [
            { text: 'Scenarios', link: '/guides/scenarios' },
            { text: 'Artifacts', link: '/guides/artifacts' },
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
      ],
      '/operate/': [
        {
          text: 'Install',
          items: [
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
      '/security/': [
        {
          text: 'Security',
          items: [{ text: 'Stealth considerations', link: '/security/stealth' }],
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
