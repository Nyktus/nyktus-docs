---
title: Scenarios
description: Group decoys that tell one story, so that an intruder who follows it raises one incident.
---

# Scenarios

A scenario groups the decoys that tell one story, such as the honeytokens placed on one file share, or the files and hosts of one admin workstation. An intruder who follows the story touches several of them. Nyktus correlates their events into one incident with one alert, instead of one incident for each honeytoken.

A honeytoken or honeypot belongs to at most one scenario or stands alone. A scenario belongs to the team, not to the account that created it.

## Create one

There are two ways:

- **Apply a deception of the catalog.** This creates the scenario with its honeytokens, its artifacts and a guide that says where to place them. See the [deception catalog](/guides/catalog).
- **Put one together by hand.** Create the scenario with [`POST /api/v1/scenarios`](/api/reference/scenarios#createScenario) or in the console, then add honeytokens and honeypots to it.

A scenario made by hand has a name, notes and, optionally, up to 20 activities of MITRE Engage that it carries out, such as `EAC0005` (Lures). Use the notes for the story and for where the decoys are placed, so that whoever triages an incident or cleans up knows. Names need not be unique. Nyktus checks the Engage activities against the version it ships.

A scenario that holds deceptions lists them in `deceptions`, each with its `deception_id`, the `language` of its guide and names, and when it joined. Its `persona` holds the values that the files of the scenario share, and only grows, see [Add a deception or an artifact](#add-a-deception-or-an-artifact). A scenario made by hand has neither.

## Add decoys

A honeytoken or honeypot joins a scenario through an operation of its own, not through a change of the decoy, because the scenario decides how its events are correlated:

```sh
curl --fail-with-body --request PUT "<console-url>/api/v1/honeytokens/<id>/scenario" \
  --header "Authorization: Bearer $NYKTUS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"scenario_id": "<scenario-id>"}'
```

[`PUT /api/v1/honeypots/<id>/scenario`](/api/reference/honeypots#assignHoneypotScenario) works the same way. The rules:

- Assigning a decoy to the scenario it already belongs to changes nothing.
- A decoy that belongs to another scenario gets `409` (`honeytoken_in_scenario` or `honeypot_in_scenario`). Remove it from that scenario first, so that nothing takes a decoy from a scenario by mistake.
- A scenario that does not exist gets `422` with the code `scenario_not_found`.
- `DELETE` on the same path removes the decoy from its scenario. It stays and stands alone.

Changing the scenario of a honeytoken needs `honeytokens:write` only: the honeytoken changes, the scenario does not. The same holds for honeypots and `honeypots:write`.

## Add a deception or an artifact

A scenario can hold several deceptions, each with its own honeytokens, artifacts and guide, and artifacts of the catalog can join later. This request adds a deception to a scenario that exists:

```sh
curl --fail-with-body --request POST "<console-url>/api/v1/scenarios/<id>/deceptions" \
  --header "Authorization: Bearer $NYKTUS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"deception_id": "directory-and-shares", "language": "en", "persona": {"Domain": "corp.example.com", "Contact": "Infrastructure team", "ComputerName": "fs-archive01"}}'
```

[`POST /api/v1/scenarios/<id>/deceptions`](/api/reference/scenarios#addScenarioDeception) creates the honeytokens of the deception, adds them to the scenario, renders its artifacts and its guide, and answers `201` as applying a deception does. `artifacts` selects the artifacts as it does there. [`POST /api/v1/scenarios/<id>/artifacts`](/api/reference/scenarios#addScenarioArtifact) adds one artifact of the catalog. Its `bindings` name the honeytoken of the scenario for each slot, by the key of the slot:

```sh
curl --fail-with-body --request POST "<console-url>/api/v1/scenarios/<id>/artifacts" \
  --header "Authorization: Bearer $NYKTUS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"catalog_artifact": "ad-computer-object", "persona": {"ComputerName": "fs-archive01"}, "bindings": {"Computer": "<honeytoken-id>"}}'
```

The rules:

- A deception joins a scenario at most once (`409`, `deception_already_added`). For other values of the persona, apply it to a scenario of its own.
- The persona belongs to the scenario and only grows. A key that the scenario lacks is added. A value that it has stays: the request may repeat it or leave it out, and a different value gets `409` with the code `persona_conflict`, which names the key and neither value. Files that you placed keep agreeing with those that follow.
- A scenario holds at most 20 deceptions and 200 artifacts (`409`, `scenario_limit`).
- A bound honeytoken must belong to the scenario and be of a type that the slot takes, otherwise the request gets `400`. A required slot needs one. An optional slot that you leave out makes the file pocket litter.
- Every artifact generates its own secrets. A password in an artifact that you add later is not the one in the older files of the scenario.
- `404` means the scenario does not exist. An unknown deception or artifact, an invalid selection of artifacts, a binding or a persona value that does not fit gets `400`. `422` has the code `dns_not_configured` if a DNS honeytoken needs a zone that the console does not know, or `artifact_reveals_decoy` if a value would make the file reveal what it is.
- `scenarios:write` covers the honeytokens and artifacts that the request creates, as for applying a deception. The Engage activities of the scenario gain those that follow from what joined, up to 20.

## Incidents of a scenario

The events of every honeytoken and honeypot of a scenario join one open incident, with one alert. A request of a URL and a session on a host of the same story are one incident. The incident and its alert name the scenario as their resource, and `GET /api/v1/incidents?resource_id=<scenario-id>` lists the incidents of a scenario.

An event belongs to the scenario its decoy belonged to when the event was recorded:

- A decoy that joins a scenario while it has an open incident of its own keeps that incident open until it is triaged or closes after its inactivity. Its next events join the incident of the scenario.
- A decoy that leaves a scenario opens incidents of its own again.
- Incidents of a scenario remain when the scenario is deleted.

## The guide

A scenario that holds deceptions has a guide for each of them, rendered for this scenario: where to place the artifacts and how to test them. [`GET /api/v1/scenarios/<id>/guide`](/api/reference/scenarios#getScenarioGuide) returns them in the order the deceptions joined, each with its `deception_id`, its `language` and the Markdown in `content`. A scenario made by hand holds no deception and has no guides.

The scenario is a snapshot. A later release with a changed catalog changes neither its artifacts nor its guides.

## Delete a scenario

[`DELETE /api/v1/scenarios/<id>`](/api/reference/scenarios#deleteScenario) deletes a scenario. The parameters `honeytokens`, `honeypots` and `artifacts` choose what happens to each kind of member:

- `keep`, the default, removes them from the scenario. They stay and stand alone. The next events of a honeytoken open incidents of their own, and you can still download the artifacts to find what was placed.
- `delete` deletes them with the scenario. Remove their URLs, names and files from where you placed them, and stop the honeypots on their sensor, because a deleted honeytoken or honeypot records nothing.

```sh
curl --fail-with-body --request DELETE \
  "<console-url>/api/v1/scenarios/<id>?honeytokens=delete&honeypots=delete&artifacts=delete" \
  --header "Authorization: Bearer $NYKTUS_API_KEY"
```

The answer is `204`. Events and incidents remain either way. The deletion and everything it removes take effect together or not at all.

`honeypots=delete` needs `honeypots:write` as well as `scenarios:write`, because honeypots join a scenario only through that permission. Without it the request gets `403`.

## Who can read scenarios

Names, notes, personas and guides tell where decoys are placed and what they are called, so they are part of the inventory. Give integrations that do not manage scenarios API keys without `scenarios:read` and `scenarios:write`. Note that `scenarios:read` also requires `honeytokens:read`, because a guide names the URLs of honeytokens. See [Authentication](/api/authentication#choosing-scopes).
