---
name: Nyktus Docs
description: Documentation in the world of the Nyktus landing page. A calm reading column in a silver frame; dark ink plates for everything a machine reads or writes.
colors:
  silver: "#eef1ef"
  surface: "#f6f8f7"
  surface-raised: "#ffffff"
  line: "#cbd4cf"
  line-soft: "#dde3df"
  ink: "#13201a"
  slate: "#4b5852"
  mint: "#a8e6bd"
  mint-hover: "#92dcab"
  mint-soft: "#d9f3e2"
  forest: "#1d6a45"
  forest-deep: "#14533a"
  trace: "#8a9993"
  trace-strong: "#6c7a73"
  plate: "#13201a"
  plate-line: "#2a3832"
  plate-text: "#e2e9e5"
  plate-muted: "#93a19a"
typography:
  headline:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2rem, 1.6rem + 1.4vw, 2.625rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.022em"
  body:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  subtitle:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  ui:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.4
  lede:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.55
  wordmark:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 800
    letterSpacing: "-0.03em"
  display:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.6rem, 1.2rem + 5vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.04em"
  label:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
  caption:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
  figure-label:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  mono:
    fontFamily: "JetBrains Mono Variable, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.8125rem"
    lineHeight: 1.75
rounded:
  xs: "4px"
  chip: "6px"
  sm: "8px"
  md: "12px"
components:
  nav-item-current:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  button-primary:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "3rem"
  code-plate:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.plate-text}"
    rounded: "{rounded.md}"
  container:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
---

# Design System: Nyktus Docs

## Overview

The documentation is a Read surface inside the world of the landing page, whose DESIGN.md owns the palette, the typefaces and the node vocabulary. This file records only what the docs surface decides on top of it. The frame (navigation, sidebar, plates, rules) carries the identity; the reading column inside it stays calm: one grotesk, real contrast, a measure of about 70 characters, nothing performing behind the text.

The theme is light only. The plates for code are dark in every case.

## Decisions for the docs surface

- **Type steps:** the body is 1.0625rem; interface text (navigation, tables, containers) is `ui` at 0.9375rem; level 3 headings are `subtitle`; the sentence under the home headline is `lede`; the wordmark is `wordmark`. `caption` marks the language of a plate. `display` appears only on the home page. Diagram text uses `figure-label` for role names set in the mono face, and 12.5 to 16px for the rest, in SVG units.
- **Corners:** 12px for plates, containers and panels, 8px for buttons and the current-page pill, 6px for inline code, 4px for the focus ring.
- **Dashed paths:** figures draw what an intruder sets off with `trace-strong`, a step darker than `trace`, because a line needs 3:1 against the pale surface and `trace` does not reach it.
- **Reading column:** 44rem wide, body 1.0625rem on a 1.65 line. Headings are 700 weight, tight and balanced. Level 2 headings open with a soft hairline and generous space above, not below. A fixed rem scale, not fluid type, except the home headline.
- **Navigation:** the sidebar sits on the silver ground, separated by a hairline. The current page is a mint pill with ink text, never a coloured bar. Group titles are 700 weight at 0.8125rem; items are 500 weight slate.
- **Plates:** code is set on the ink plate with a soft shadow that is lighter than the landing page's Lift, because a page holds many plates. Syntax colours stay inside the plate palette; mint colours strings only. A highlighted line is a faint mint wash.
- **Containers:** all share one neutral raised panel with a hairline and 12px corners. Warning and danger differ by an ink border, not by hue, and every container names itself in its title, so nothing depends on colour.
- **Tables:** hairlines only, no zebra stripes, header on the pale surface in label type.
- **Links:** forest with a 1px underline, deep forest and 2px on hover, also inside containers.
- **Home:** the headline of the landing page at display size, one sentence of slate lede, then ruled link rows. No eyebrow, no feature cards.
- **Focus, selection, scrollbars:** forest focus ring, mint selection with ink text, scrollbar colours from the palette.
- **Fonts:** bundled from the Fontsource packages at build time, their licences linked from the footer. Nothing is loaded from another origin.

## Do's and Don'ts

### Do
- Put ink on every mint surface and keep all text at WCAG AA.
- Use mint as a fill that marks the current place or a signal, never as text on the light ground.
- Keep machine text in plates and prose in the grotesk.

### Don't
- Don't put an eyebrow or kicker above a heading.
- Don't use a coloured left or right border on a callout, or an equal-card feature grid.
- Don't add a second theme without testing the plates, the diagram and the tables in it.
