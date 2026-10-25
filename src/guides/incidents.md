---
title: Incidents
description: How events become incidents, how to triage them, what they hold, and how long Nyktus keeps them.
---

# Incidents

An incident collects the events of one scenario, or of one honeytoken or honeypot that stands alone. The first event opens it, and every further event joins it until it is closed. You triage incidents, not events, so that an intruder who opens a URL ten times raises one incident instead of ten. When an incident opens, Nyktus raises its alert. This page explains how events become incidents, how to triage, and what an incident holds.

## How events become incidents

The worker processes every event that the trigger or the DNS role records, whether it is a request of a honeytoken or a session of a honeypot:

- If the honeytoken or honeypot belonged to a scenario when the event was recorded, the event joins the open incident of the scenario. Every decoy of a scenario shares one incident and one alert: an intruder who follows the story raises one alert, and one who opens a URL and then logs in to a host of the same story is one incident.
- Otherwise the event joins the open incident of its honeytoken or honeypot.
- If there is none, the event opens a new incident and raises its alert.

A scenario, and a decoy that stands alone, has at most one open incident at a time, also when several workers process its events at the same moment.

An incident is `open` until someone looks into it, `acknowledged` while someone does, and `closed` when the triage is finished. An acknowledged incident is still open: it keeps collecting events. A closed incident is never opened again. The next event opens a new incident with a new alert.

**Close an incident when you have finished.** While it stays open, new events of its scenario or decoy join it without an alert, even if they come from someone else.

### Inactive incidents close themselves

The worker closes an incident, open or acknowledged, whose last event is more than `NYKTUS_INCIDENT_AUTO_CLOSE_DAYS` old, 14 days by default, so that a forgotten incident does not swallow the alerts of a later intrusion. A triage does not count as activity, only a new event does. Set the variable to `0` to leave every incident open until it is triaged, or to a value from 1 to 365 days. The audit log records each closing as `incident.update` of the field `status` by the system.

### The name of an incident

`resource_name` holds the name of the scenario, honeytoken or honeypot at the moment the incident opened. It is a snapshot: renaming or deleting the resource changes neither it nor the incident, so an incident still says what was triggered. `resource_id` finds the resource itself if it still exists. Events and incidents outlive their decoys.

## Severity and techniques

The severity says how urgently someone should look: `low`, `medium`, `high` or `critical`. Every event keeps the severity of its honeytoken or honeypot at the time, and the incident takes the highest severity of its events. An incident holds every technique of its events.

An analyst can override both. The incident then shows the effective `severity` and `techniques`, next to what the events suggest (`event_severity`, `event_techniques`) and the overrides themselves (`severity_override`, `techniques_override`, null if there are none). An analyst can override the severity with `info` for an incident that turned out to be irrelevant, which no decoy can do.

## Triage

In the console, the incident list shows what is not closed, newest first, and an incident shows its events. Administrators and users triage, and the role `viewer` only reads. Closing asks first, because a closed incident never opens again.

From a script, [`PATCH /api/v1/incidents/<id>`](/api/reference/incidents#triageIncident) needs the scopes `incidents:write` and `incidents:read`:

```sh
curl --fail-with-body --request PATCH "<console-url>/api/v1/incidents/<id>" \
  --header "Authorization: Bearer $NYKTUS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"status": "acknowledged", "notes": "Checking the mail templates."}'
```

| Field | Rules |
|---|---|
| `status` | `open`, `acknowledged` or `closed`. It only moves forward and may skip `acknowledged`. A request to move it back, for example to reopen a closed incident, gets `409` with the code `invalid_state`. Nyktus records the times as `acknowledged_at` and `closed_at`. |
| `notes` | Replaces the notes, up to 10000 characters. Line breaks and tabs are allowed. |
| `severity_override` | `info`, `low`, `medium`, `high` or `critical`. `null` removes the override. |
| `techniques_override` | Up to 20 distinct identifiers. An empty list states that the incident suggests no technique. `null` removes the override. |

Members you leave out stay unchanged. Notes and overrides can still change after an incident is closed, for example to record the outcome. Notes are free text. Keep personal data, such as the names of employees, out of them, or restrict who reads incidents.

## Reading incidents and events

Every role reads incidents and events. An API key needs `incidents:read` or `events:read`.

- [`GET /api/v1/incidents`](/api/reference/incidents#listIncidents) lists incidents from the most recently opened to the oldest. `status` narrows the list to one or more statuses separated by commas, such as `status=open,acknowledged` for everything that is not closed. `resource_id` narrows it to one scenario, honeytoken or honeypot, and `resource_type` of an incident says which.
- [`GET /api/v1/events`](/api/reference/events#listEvents) lists events from the most recently recorded to the oldest. `incident_id` narrows the list to the events of one incident. To read the events of a decoy, list its incidents and those of its scenario, then their events.

Events are listed by the time they were recorded (`recorded_at`), not by the time the request arrived (`occurred_at`), because the DNS role records a query up to five minutes after it arrived. Events recorded meanwhile do not shift the following pages. If you collect events regularly, for example into a SIEM, start each read a few seconds before the newest event you have and skip the identifiers you already know, because an event is listed by the time it was written, which can precede the commit of a slow transaction.

## Personal data

Events contain personal data: the address of the client, for DNS the address of the resolver, for a honeypot the address of the attacker, the `User-Agent`, `Referer` and `Accept-Language` headers, for a `POST` the start of its body, and in the event of a session what the attacker typed, such as user names and search filters. Passwords are never stored, only their length. Incidents and alerts hold none of it: they name the scenario, honeytoken or honeypot, the times, the severity and the techniques.

Every read of events is recorded in the audit log as `events.read`, at most once per user or key and minute. A read that cannot be recorded returns no events.

Nyktus records these data to detect and investigate intrusions into your network. In the EU, this is usually covered by the legitimate interest in the security of networks and information (Art. 6(1)(f) and Recital 49 GDPR). Record it in your records of processing activities. Triage needs events, so every role reads them. Grant accounts, `viewer` included, only to people who triage, and give integrations that do not need client addresses keys without `events:read`.

## Retention

The worker deletes, every hour, what is older than `NYKTUS_EVENT_RETENTION_DAYS`, 180 days by default and between 30 and 3650:

- **Events**, counted from when they were recorded, whether their incident is open or closed. An event that no incident has taken up yet stays until it has.
- **Closed incidents**, counted from when they closed, with their alert and its deliveries. Open incidents stay, and their `event_count` keeps counting deleted events, so an incident can list fewer events than it counts.

The audit log does not record the deletion. The log of the worker records how many rows each run deleted. Backups of the database hold events beyond the retention, so give them a retention that fits.
