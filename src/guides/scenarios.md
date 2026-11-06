---
title: Scenarios
description: Group decoys that tell one story, so that an intruder who follows it raises one incident, and work through a deception step by step.
---

# Scenarios

A scenario groups the decoys that tell one story, such as the honeytokens placed on one file share, or the files and hosts of one admin workstation. An intruder who follows the story touches several of them. Nyktus correlates their events into one incident with one alert, instead of one incident for each honeytoken.

A honeytoken or honeypot belongs to at most one scenario or stands alone. A scenario belongs to the team, not to the account that created it.

## Create one

There are two ways:

- **Apply a deception of the catalog.** This creates the scenario with the identifier of the deception and, if you ask for it, the honeytokens and honeypots that the deception needs. See the [deception catalog](/guides/catalog).
- **Put one together by hand.** Create the scenario with [`POST /api/v1/scenarios`](/api/reference/scenarios#createScenario) or in the console, then add honeytokens and honeypots to it.

A scenario made by hand has a name, notes and, optionally, up to 20 activities of MITRE Engage that it carries out, such as `EAC0005` (Lures). Use the notes for the story and for where the decoys are placed, so that whoever triages an incident or cleans up knows. Names need not be unique. Nyktus checks the Engage activities against the version it ships, and [`GET /api/v1/catalog/engage`](/api/reference/catalog#listCatalogEngageActivities) lists their names.

A scenario that holds deceptions lists them in `deceptions`, each with its `deception_id` and when it joined. Nothing else of a deception is stored: its guide, slots and files are read from the catalog when they are shown.

## Work through a deception

A deception is a guide, and the scenario is the checklist for it. The page of a scenario in the console shows, for each deception, what it asks for, its example files and its guide. The steps are the same through the API:

1. **Read what it asks for.** [`GET /api/v1/catalog/deceptions/<id>`](/api/reference/catalog#getCatalogDeception) lists the slots: the honeytokens by type and the honeypots by service. In the console, each row has a button that opens the form for a new honeytoken or honeypot with the scenario, the type, the name and the techniques already filled in. You can change all of it.
2. **Create the honeytokens and honeypots,** or let applying the deception create them with `create_resources`. Create them in the scenario with `scenario_id`, see below.
3. **Download the example files** and replace the placeholders with the values of the honeytokens, as the guide says.
4. **Adapt names and passwords,** place the files, and write in the notes of the scenario where you placed them.
5. **Test** with the command in the `Testing` section of the guide, then close the incident that the test opened.

Nyktus does not remember which honeytoken you created for which slot, so the console shows no progress such as "2 of 3 created". Creating a row twice creates two resources.

## Add decoys

A honeytoken or honeypot joins a scenario when you create it, with `scenario_id`:

```sh
curl --fail-with-body --request POST "<console-url>/api/v1/honeytokens" \
  --header "Authorization: Bearer $NYKTUS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"type": "dns", "name": "Jump host", "scenario_id": "<scenario-id>"}'
```

[`POST /api/v1/honeypots`](/api/reference/honeypots#createHoneypot) takes the same member. Without it, the decoy stands alone. The answer shows the scenario in `scenario_id`:

```json
{
  "id": "06c52f0c-e178-4c00-9991-a07186d6ec28",
  "type": "dns",
  "name": "Jump host",
  "notes": "",
  "enabled": true,
  "redirect_url": null,
  "techniques": [],
  "severity": "medium",
  "trigger_value": "ibnxeba62d45q733la64tk7v6e",
  "trigger_url": null,
  "trigger_names": ["ibnxeba62d45q733la64tk7v6e.d.example.net"],
  "scenario_id": "3bd4cbd0-1b32-4acc-8be2-9d5424154230",
  "created_at": "2026-11-06T17:39:08.58964Z",
  "updated_at": "2026-11-06T17:39:08.58964Z"
}
```

Two requests fail without creating anything. A scenario that does not exist gets `422`:

```json
{"error": {"code": "scenario_not_found", "message": "the scenario does not exist", "request_id": "CYQSNAWAL2MUHOZ5WVBOLR57JR"}}
```

An identifier that is not a UUID in lowercase letters gets `400` with the message `scenario_id must be a UUID in lower case`, and so does `null`.

A decoy that already exists joins through an operation of its own, not through a change of the decoy, because the scenario decides how its events are correlated:

```sh
curl --fail-with-body --request PUT "<console-url>/api/v1/honeytokens/<id>/scenario" \
  --header "Authorization: Bearer $NYKTUS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"scenario_id": "<scenario-id>"}'
```

[`PUT /api/v1/honeypots/<id>/scenario`](/api/reference/honeypots#assignHoneypotScenario) works the same way. The rules:

- Assigning a decoy to the scenario it already belongs to changes nothing.
- A decoy that belongs to another scenario gets `409` (`honeytoken_in_scenario` or `honeypot_in_scenario`). Remove it from that scenario first, so that nothing takes a decoy from a scenario by mistake.
- `DELETE` on the same path removes the decoy from its scenario. It stays and stands alone.

Creating a decoy in a scenario and changing its scenario need `honeytokens:write` or `honeypots:write`, not `scenarios:write`: the decoy changes, the scenario does not. The audit log records the scenario as the field `scenario_id` of `honeytoken.create`, `honeypot.create` or the update.

[`GET /api/v1/honeytokens?scenario_id=<scenario-id>`](/api/reference/honeytokens#listHoneytokens) and the same filter of [`GET /api/v1/honeypots`](/api/reference/honeypots#listHoneypots) list the decoys of a scenario.

## Add a deception

A scenario can hold several deceptions. This request adds one to a scenario that exists, and creates its honeytokens and honeypots in it:

```sh
curl --fail-with-body --request POST "<console-url>/api/v1/scenarios/<id>/deceptions" \
  --header "Authorization: Bearer $NYKTUS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"deception_id": "directory-and-shares", "language": "en", "create_resources": true}'
```

[`POST /api/v1/scenarios/<id>/deceptions`](/api/reference/scenarios#addScenarioDeception) answers `201` as applying a deception does, with the scenario and what was created. The rules:

- A deception joins a scenario at most once (`409`, `deception_already_added`).
- `create_resources` needs `honeytokens:write` and `honeypots:write` besides `scenarios:write`, whatever the deception asks for. Without them the request gets `403` before anything is loaded.
- `422` has the code `dns_not_configured` if resources are to be created, the deception has a DNS honeytoken, and the console knows no zone of the DNS role.
- `404` means that the scenario does not exist. A deception that the catalog does not have gets `400` (`invalid_request`, "deception_id must be a deception of the catalog").
- The Engage activities of the scenario gain those of the deception, up to 20.

## Remove a deception

[`DELETE /api/v1/scenarios/<id>/deceptions/<deception-id>`](/api/reference/scenarios#removeScenarioDeception) ends the assignment and nothing else. The honeytokens and honeypots that were created for the deception stay in the scenario, and so do the Engage activities, so that a slip costs neither the resources nor the scenario. The answer is `200` with the scenario. A deception that the catalog no longer knows can be removed too.

If you add the deception again with `create_resources`, Nyktus creates its honeytokens and honeypots a second time.

## Incidents of a scenario

The events of every honeytoken and honeypot of a scenario join one open incident, with one alert. A request of a URL and a session on a host of the same story are one incident. The incident and its alert name the scenario as their resource, and `GET /api/v1/incidents?resource_id=<scenario-id>` lists the incidents of a scenario.

An event belongs to the scenario its decoy belonged to when the event was recorded:

- A decoy that joins a scenario while it has an open incident of its own keeps that incident open until it is triaged or closes after its inactivity. Its next events join the incident of the scenario.
- A decoy that leaves a scenario opens incidents of its own again.
- Incidents of a scenario remain when the scenario is deleted.

## The guide

The guide of a deception is Markdown with the sections `Story`, `Setup`, `Testing`, `Limits` and, where something stays behind in a system, `Removing`. The console shows it on the page of the scenario. A script reads it with `GET /api/v1/catalog/deceptions/<id>`, in the language you ask for.

The scenario is not a snapshot. It keeps the identifier of the deception, so a later release with a changed catalog changes the guide, the slots and the files that the scenario shows. Files that you have already placed stay as they are.

## Delete a scenario

[`DELETE /api/v1/scenarios/<id>`](/api/reference/scenarios#deleteScenario) deletes a scenario. The parameters `honeytokens` and `honeypots` choose what happens to each kind of member:

- `keep`, the default, removes them from the scenario. They stay and stand alone. The next events of a honeytoken open incidents of their own.
- `delete` deletes them with the scenario. Remove their URLs and names from where you placed them, and stop the honeypots on their sensor, because a deleted honeytoken or honeypot records nothing. The files you placed stay where they are; take them away yourself.

```sh
curl --fail-with-body --request DELETE \
  "<console-url>/api/v1/scenarios/<id>?honeytokens=delete&honeypots=delete" \
  --header "Authorization: Bearer $NYKTUS_API_KEY"
```

The answer is `204`. Events and incidents remain either way. The deletion and everything it removes take effect together or not at all.

`honeypots=delete` needs `honeypots:write` as well as `scenarios:write`, because honeypots join a scenario only through that permission. The console offers the option to delete the members only if you hold both `honeytokens:write` and `honeypots:write`. Without the permission the request gets `403`.

## Who can read scenarios

Names, notes and the identifiers of deceptions tell where decoys are placed and what they are called, so they are part of the inventory. Give integrations that do not manage scenarios API keys without `scenarios:read` and `scenarios:write`. See [Authentication](/api/authentication#choosing-scopes).
