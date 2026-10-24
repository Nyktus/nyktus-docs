// SPDX-FileCopyrightText: The Nyktus Authors
// SPDX-License-Identifier: AGPL-3.0-or-later

import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import ArchitectureDiagram from './components/ArchitectureDiagram.vue'
import '@fontsource-variable/schibsted-grotesk/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('ArchitectureDiagram', ArchitectureDiagram)
  },
} satisfies Theme
