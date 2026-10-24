---
title: Introduction
description: What Nyktus is, what you place with it, and what deception cannot detect.
---

# What Nyktus does

Nyktus places decoys that have no legitimate use and alerts you when someone touches one. It runs on your own infrastructure and needs nothing but PostgreSQL. This page explains the idea, the parts and the limits, so that you can decide whether Nyktus fits.

::: warning Early development
Nyktus is not ready for production use. Interfaces, configuration and the database schema change without notice until the first tagged release.
:::

## Why decoys instead of more logs

Log-based detection collects everything and searches for the needle afterwards. Deception works the other way round: you place signals that nobody has a reason to use. Nobody opens a decoy SSH configuration by accident, and nobody resolves a DNS name that exists only inside a backup archive. When a decoy fires, someone is where they should not be.

So the alerts are few, and each one deserves attention. That suits a team without a security operations center, and it makes Nyktus a low-noise source for a team that already runs a SIEM.

## What you place

| Part | What it is | It fires when |
|---|---|---|
| Honeytoken | A URL, an image, a QR code or a DNS name. | It is requested or resolved. |
| Honeypot | A network service that a sensor emulates inside your network: SSH, Telnet, PostgreSQL or LDAP. | Someone connects to it. The sensor reports the session when it ends. |
| Artifact | A file that makes a decoy believable, such as the document that holds a honeytoken's URL. | Never. |
| Scenario | Honeytokens, honeypots and artifacts that tell one story, such as a stolen finance backup. | One of its parts fires. |

You do not have to invent these. The deception catalog holds ready-made blueprints: applying one creates a scenario with its honeytokens and artifacts. Every blueprint is mapped to MITRE ATT&CK techniques, and its guide follows the MITRE Engage approach to planning deception.

## What happens when a decoy fires

Every interaction is recorded as an event. Events are grouped into one incident per scenario, or per honeytoken or honeypot that stands alone, and an incident raises one alert when it opens. An intruder who opens a URL ten times and then logs in to a honeypot of the same scenario causes one incident and one alert. Nyktus delivers the alert by email, webhook, Slack or Microsoft Teams.

## What deception cannot detect

A honeytoken fires only when someone acts on it: requests a URL, resolves a DNS name or uses a credential. Opening a stolen database dump in a viewer, or reading exfiltrated documents offline, triggers nothing. Nyktus reliably detects the *use* of stolen data and credentials, not the theft itself.

An intruder who recognizes a decoy can also avoid it, so a decoy that looks like a decoy is worth less. The [stealth considerations](/security/stealth) list what an intruder can see of your setup and what you can do about it.

## Next

- [Concepts](/getting-started/concepts) defines the terms that every page uses.
- [Architecture](/getting-started/architecture) shows the parts of Nyktus and where each one runs.
