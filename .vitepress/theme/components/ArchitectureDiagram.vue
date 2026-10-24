<!-- SPDX-FileCopyrightText: The Nyktus Authors -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

<!--
  The parts of Nyktus and the paths between them. It uses the node vocabulary of the landing
  page: open shapes are decoys, a solid shape is a real system, mint marks the alert. Dashed
  lines are what an intruder sets off, solid lines are Nyktus itself. The text of the page
  repeats everything the figure shows, so the figure is not the only source.
-->

<template>
  <figure class="architecture">
    <div class="scroll" tabindex="0" role="region" aria-label="Architecture diagram, scrollable">
      <svg
        viewBox="0 0 640 740"
        role="img"
        aria-labelledby="arch-title arch-desc"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id="arch-title">The parts of Nyktus and how they connect</title>
        <desc id="arch-desc">
          A sensor and decoys in the monitored network report to the trigger and the DNS role on
          internet-facing hosts. Both write to PostgreSQL through one database function each. The
          console and the worker, on internal hosts, read and write PostgreSQL. The operator uses the
          console. The worker delivers alerts to email, webhook, Slack and Teams.
        </desc>

        <defs>
          <marker id="arch-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M1 1 L9 5 L1 9" fill="none" stroke="#4b5852" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </marker>
          <marker id="arch-arrow-trace" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M1 1 L9 5 L1 9" fill="none" stroke="#6c7a73" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </marker>
        </defs>

        <!-- Zones -->
        <rect class="zone" x="8" y="8" width="624" height="170" rx="12" />
        <text class="zone-label" x="24" y="32">Monitored network</text>
        <rect class="zone" x="8" y="238" width="624" height="146" rx="12" />
        <text class="zone-label" x="24" y="262">Internet-facing hosts</text>
        <rect class="zone" x="8" y="444" width="624" height="210" rx="12" />
        <text class="zone-label" x="24" y="468">Internal, out of band</text>

        <!-- Flows, below the boxes -->
        <path class="flow" d="M165 162 V272" marker-end="url(#arch-arrow)" />
        <text class="flow-label" x="173" y="214">session reports</text>

        <path class="flow trace" d="M380 162 L291 272" marker-end="url(#arch-arrow-trace)" />
        <text class="flow-label" x="362" y="200">URL requested</text>

        <path class="flow trace" d="M475 162 V272" marker-end="url(#arch-arrow-trace)" />
        <text class="flow-label" x="483" y="214">name resolved</text>

        <path class="flow" d="M165 368 L240 482" marker-end="url(#arch-arrow)" />
        <text class="flow-label" x="172" y="422" text-anchor="end">one function call</text>

        <path class="flow" d="M475 368 L400 482" marker-end="url(#arch-arrow)" />
        <text class="flow-label" x="448" y="422">one function call</text>

        <path class="flow" d="M137 576 L240 540" marker-start="url(#arch-arrow)" marker-end="url(#arch-arrow)" />
        <path class="flow" d="M503 576 L400 540" marker-start="url(#arch-arrow)" marker-end="url(#arch-arrow)" />

        <path class="flow" d="M104 682 V640" marker-end="url(#arch-arrow)" />
        <text class="flow-label" x="114" y="664">browser, API clients</text>

        <path class="flow" d="M503 638 V682" marker-end="url(#arch-arrow)" />
        <text class="flow-label" x="513" y="664">outbound only</text>

        <!-- Monitored network -->
        <rect class="part" x="24" y="48" width="282" height="114" rx="8" />
        <text class="title" x="40" y="76">Sensor</text>
        <text class="mono" x="40" y="98">nyktus-sensor</text>
        <text class="sub" x="40" y="124">Honeypots: SSH, Telnet,</text>
        <text class="sub" x="40" y="143">PostgreSQL, LDAP</text>
        <rect class="decoy-glyph" x="270" y="60" width="16" height="16" />

        <rect class="part" x="334" y="48" width="282" height="114" rx="8" />
        <text class="title" x="350" y="76">Decoys</text>
        <text class="sub" x="350" y="104">Honeytokens in documents,</text>
        <text class="sub" x="350" y="123">configuration files and shares</text>
        <circle class="decoy-glyph" cx="596" cy="68" r="8" />

        <!-- Internet-facing hosts -->
        <rect class="part" x="24" y="276" width="282" height="92" rx="8" />
        <text class="title mono-title" x="40" y="305">trigger</text>
        <text class="sub" x="40" y="329">Answers every request alike,</text>
        <text class="sub" x="40" y="348">receives the reports of sensors</text>

        <rect class="part" x="334" y="276" width="282" height="92" rx="8" />
        <text class="title mono-title" x="350" y="305">dns</text>
        <text class="sub" x="350" y="329">Authoritative DNS for the zones</text>
        <text class="sub" x="350" y="348">of DNS honeytokens</text>

        <!-- Internal -->
        <rect class="part" x="215" y="486" width="210" height="52" rx="8" />
        <text class="title" x="320" y="518" text-anchor="middle">PostgreSQL</text>

        <rect class="part" x="24" y="578" width="226" height="60" rx="8" />
        <text class="title mono-title" x="40" y="604">console</text>
        <text class="sub" x="40" y="624">API and web console</text>

        <rect class="part" x="390" y="578" width="226" height="60" rx="8" />
        <text class="title mono-title" x="406" y="604">worker</text>
        <text class="sub" x="406" y="624">Incidents and alerts</text>

        <!-- Outside of Nyktus -->
        <rect class="real-glyph" x="96" y="686" width="16" height="16" rx="2" />
        <text class="sub" x="120" y="700">Operator</text>

        <circle class="alert-glyph" cx="420" cy="704" r="8" />
        <text class="sub" x="436" y="709">Email, webhook, Slack, Teams</text>
      </svg>
    </div>
    <figcaption>
      Dashed lines are what an intruder sets off. Solid lines are Nyktus. Roles communicate only
      through PostgreSQL; the trigger and the DNS role reach it through one function each.
      <span class="scroll-hint">Scroll the figure sideways to see all of it.</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.architecture {
  margin: 1.75rem 0;
}

/* The drawing keeps its size on a phone and scrolls, so that its text stays readable. */
.scroll {
  overflow-x: auto;
  border-radius: var(--radius);
}

svg {
  display: block;
  width: 100%;
  min-width: 560px;
  height: auto;
}

.zone {
  fill: var(--surface);
  stroke: var(--line);
  stroke-width: 1;
}

.zone-label {
  font: 600 13px var(--font-sans);
  fill: var(--slate);
}

.part {
  fill: var(--surface-raised);
  stroke: var(--ink);
  stroke-width: 1.5;
}

.title {
  font: 700 16px var(--font-sans);
  letter-spacing: -0.01em;
  fill: var(--ink);
}

.mono-title,
.mono {
  font-family: var(--font-mono);
  font-variant-ligatures: none;
}

.mono-title {
  font-weight: 600;
  font-size: 15px;
}

.mono {
  font-size: 13px;
  fill: var(--slate);
}

.sub {
  font: 400 14px var(--font-sans);
  fill: var(--slate);
}

.flow {
  fill: none;
  stroke: var(--slate);
  stroke-width: 1.5;
}

.flow.trace {
  stroke: #6c7a73;
  stroke-dasharray: 6 6;
  stroke-linecap: round;
}

.flow-label {
  font: 500 12.5px var(--font-sans);
  fill: var(--slate);
  paint-order: stroke;
  stroke: var(--surface);
  stroke-width: 4px;
  stroke-linejoin: round;
}

.decoy-glyph {
  fill: var(--silver);
  stroke: var(--ink);
  stroke-width: 1.6;
}

.real-glyph {
  fill: var(--trace);
}

.alert-glyph {
  fill: var(--mint);
  stroke: var(--ink);
  stroke-width: 1.75;
}

.scroll-hint {
  display: none;
}

@media (max-width: 40rem) {
  .scroll-hint {
    display: inline;
  }
}

figcaption {
  margin-top: 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--slate);
}
</style>
