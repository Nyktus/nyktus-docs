// SPDX-FileCopyrightText: The Nyktus Authors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ThemeRegistration } from 'shiki'

// Syntax colors for the code plates. The palette is the one of the plates in style.css: ink
// ground, light text, and mint only for strings, the one thing that is data and not syntax.
// Every color has at least 6:1 contrast on the plate.
export const plateTheme: ThemeRegistration = {
  name: 'nyktus-plate',
  type: 'dark',
  colors: {
    'editor.background': '#13201a',
    'editor.foreground': '#e2e9e5',
  },
  tokenColors: [
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#93a19a' },
    },
    {
      scope: ['string', 'string.quoted', 'punctuation.definition.string'],
      settings: { foreground: '#a8e6bd' },
    },
    {
      scope: ['keyword', 'storage', 'storage.type', 'keyword.control'],
      settings: { foreground: '#f6f8f7', fontStyle: 'bold' },
    },
    {
      scope: ['constant', 'constant.numeric', 'constant.language', 'variable.other.constant'],
      settings: { foreground: '#d9f3e2' },
    },
    {
      scope: ['entity.name.function', 'support.function', 'entity.name.tag', 'meta.function-call'],
      settings: { foreground: '#ffffff' },
    },
    {
      scope: ['entity.name.type', 'support.type', 'support.class', 'entity.other.attribute-name'],
      settings: { foreground: '#b5c7bd' },
    },
    {
      scope: ['support.type.property-name', 'meta.object-literal.key', 'entity.name.tag.yaml'],
      settings: { foreground: '#d9f3e2' },
    },
    {
      scope: ['variable', 'variable.parameter', 'variable.other'],
      settings: { foreground: '#e2e9e5' },
    },
    {
      scope: ['punctuation', 'meta.brace', 'keyword.operator'],
      settings: { foreground: '#b5c7bd' },
    },
  ],
}
