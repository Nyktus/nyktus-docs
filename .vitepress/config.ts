// SPDX-FileCopyrightText: The Nyktus Authors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { defineConfig } from 'vitepress'
import { plateTheme } from './plate-theme'

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
      { text: 'Security', link: '/security/stealth', activeMatch: '/security/' },
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting started',
          items: [
            { text: 'What Nyktus does', link: '/getting-started/introduction' },
            { text: 'Concepts', link: '/getting-started/concepts' },
            { text: 'Architecture', link: '/getting-started/architecture' },
          ],
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
