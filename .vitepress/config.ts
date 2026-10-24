// SPDX-FileCopyrightText: The Nyktus Authors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { defineConfig } from 'vitepress'

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

  locales: {
    root: {
      label: 'English',
      lang: 'en',
    },
  },

  themeConfig: {
    siteTitle: 'Nyktus Docs',

    nav: [],
    sidebar: {},

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
        'Text under CC BY-SA 4.0. MITRE, ATT&CK and MITRE Engage are trademarks of The MITRE Corporation; Nyktus is not affiliated with or endorsed by MITRE.',
      copyright: 'Copyright © The Nyktus Authors',
    },
  },

  // Nothing is loaded from another origin at runtime, the same promise that Nyktus makes.
  head: [['meta', { name: 'theme-color', content: '#eef1ef' }]],

  markdown: {
    lineNumbers: false,
  },
})
