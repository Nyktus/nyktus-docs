---
title: Concepts
description: The terms that every page of this documentation uses, and how the things they name relate.
---

# Concepts

Nyktus uses a small set of terms with fixed meanings. This page defines them and states the rules that connect them. Read it once, then use it as a reference.

## Terms

| Term | Meaning |
|---|---|
| Honeytoken | A trigger that raises an event when it is requested or resolved: a URL, an image, a QR code or a DNS name. |
| Honeypot | A network service that the sensor emulates. It answers like the real service and offers nothing behind the login. |
| Artifact | A file that makes a scenario believable, such as the document that holds a honeytoken's URL. An artifact never raises an event itself; the honeytokens it names do. An artifact without a honeytoken is called pocket litter. |
| Scenario | A group of honeytokens, honeypots and artifacts that together tell one believable story. |
| Deception | A blueprint in the catalog. Applying it creates a scenario with its resources. A deception is not an object of a running installation. |
| Catalog | The versioned collection of deceptions, with their mappings to techniques and their guides. It ships with Nyktus. |
| Event | One recorded interaction with a honeytoken or honeypot: a request, a DNS query or a session. |
| Incident | Correlated events. You triage incidents, not events. |
| Alert | The single notification sent when an incident opens. |
| Sensor | The program `nyktus-sensor`, which runs honeypots inside a monitored network and reports their sessions. |
| Trigger | The server role that answers the URLs of honeytokens and receives the reports of sensors. |

## How the parts relate

A honeytoken, honeypot or artifact belongs to at most one scenario or stands alone. One installation serves one organization; there is no multi-tenancy.

Applying a deception creates a scenario with its honeytokens and artifacts and renders its guide: where to place the artifacts and how to test them. The scenario is a snapshot. A later release with a changed catalog does not change its artifacts or its guide.

## From touch to alert

1. Someone requests a honeytoken, resolves its name, or connects to a honeypot. Nyktus records an **event**.
2. The event joins the open **incident** of its scenario. If the honeytoken or honeypot stands alone, it joins the open incident of that resource. If there is no open incident, the event opens one.
3. Opening an incident raises its **alert**. Later events join the incident without another alert, until someone closes it.

An incident is `open`, `acknowledged` or `closed`. Close an incident when you have finished looking into it. While it stays open, a new event of the same scenario or resource joins it silently, even if it comes from someone else. A closed incident is never opened again: the next event opens a new incident with a new alert. An incident without an event for 14 days is closed automatically; the operator can change the period or switch this off.

## ATT&CK and Engage

Two frameworks of MITRE describe the two sides:

- **ATT&CK techniques** describe attacker behavior. They are attached to honeytokens, honeypots, events and incidents, so that an alert says what the touch suggests.
- **Engage activities** describe what a defender does to engage an adversary. They are attached to deceptions and scenarios, so that a scenario says which activities it carries out.

Neither framework is a configuration of Nyktus: the mappings document what a decoy detects and why it exists.
