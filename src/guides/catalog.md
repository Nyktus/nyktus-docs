---
title: Deception catalog
description: Choose a deception, apply it to create a scenario, and know what the files it renders can and cannot give away.
---

# Deception catalog

The catalog holds the deceptions that ship with Nyktus: blueprints of scenarios, such as an SSH configuration whose jump host is a DNS honeytoken, or a Windows shortcut to the URL of a honeytoken. A deception describes the honeytokens it creates, the values it asks you for so that its files fit your environment, and the files it renders, together with a guide that says where to place them and how to test them. This page helps you choose one, apply it, and understand what its files give away.

The catalog is part of the server binary and the same in every installation. Nyktus checks it when the console starts, and a server whose catalog does not validate does not start. Nothing is loaded at runtime, and the catalog contains no executable code. New deceptions come with new releases. To add your own, put them into `catalog/` of the source and build Nyktus yourself, as `catalog/README.md` of the repository describes.

## Choose a deception

The [catalog reference](/guides/catalog-reference) lists every deception with the honeytokens it creates, the values it asks for and the files it renders. The console shows the same and applies a deception with a form.

[`GET /api/v1/catalog/deceptions`](/api/reference/catalog#listCatalogDeceptions) returns the whole list, ordered by identifier and not paged. [`GET /api/v1/catalog/deceptions/<id>`](/api/reference/catalog#getCatalogDeception) returns one. Texts are English; add `?lang=de` for German.

| Field | Meaning |
|---|---|
| `category` | What the deception pretends to be: `identity`, `network`, `data`, `endpoint` or `application`. |
| `techniques` | The MITRE ATT&CK techniques that a trigger of the deception suggests. |
| `engage_activities` | The activities of MITRE Engage that the deception carries out, such as `EAC0005` (Lures) and `EAC0011` (Pocket Litter). |
| `honeytokens` | The honeytokens that applying it creates, with the techniques and severity each receives. A deception raises the severity above the default of the type for a honeytoken that nobody but an intruder has a reason to use, such as the host in a `.netrc`. |
| `persona` | The values you enter so that the files fit your environment. `host` is a host name, `name` an account name, and `text` free text that appears only in files a person reads. `example` only illustrates a value. |
| `secrets` | Random values, such as passwords, that Nyktus generates when you apply the deception. |
| `artifacts` | The files it renders. A deception without artifacts consists of its guide, for example because you write the document yourself. |

## Apply a deception

Applying a deception creates a scenario with its honeytokens and its artifacts, and renders its guide. Everything is created together or not at all. This request applies `ssh-config`:

```sh
curl --fail-with-body --request POST \
  "<console-url>/api/v1/catalog/deceptions/ssh-config/apply" \
  --header "Authorization: Bearer $NYKTUS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name": "Admin workstation ws07", "language": "en", "persona": {"Domain": "corp.example.com", "Account": "j.doe"}}'
```

The key needs `scenarios:write`, which covers the honeytokens and artifacts that applying creates. A scope to write brings the scope to read the same resource, and `scenarios:read` brings `honeytokens:read`, because the response names the URLs of honeytokens. The response, with status `201`, holds the `scenario`, its `honeytokens` and its `artifacts` without their content.

- `name` and `notes` name the new scenario, with the rules of a [scenario](/guides/scenarios).
- `language` is `en` by default, or `de`. It sets the language of the guide and of the names of the honeytokens.
- `persona` must hold a value for every value of the deception, by its key, and nothing else. There are no defaults, because a value that every installation shares would identify the files as decoys. Each value must match its kind: a `host` is a host name in lowercase letters, digits, hyphens and dots, a `name` is an account name of up to 64 letters, digits, dots, hyphens and underscores, and a `text` is one line of up to 200 characters.

What you get next:

- The honeytokens belong to the scenario, are enabled, and have the techniques and the severity of the deception.
- The artifacts are rendered with the URLs of the honeytokens under the address of your trigger, and the names of DNS honeytokens under the first zone of `NYKTUS_DNS_ZONES`. Download each with [`GET /api/v1/artifacts/<id>/content`](/api/reference/artifacts#downloadArtifact), and record where you placed it. See [Artifacts](/guides/artifacts).
- [`GET /api/v1/scenarios/<id>/guide`](/api/reference/scenarios#getScenarioGuide) returns the guide for this scenario.

### What can go wrong

| Status and code | Reason |
|---|---|
| `400` `invalid_request` | A field is invalid. The message names it, for a persona value with its key, for example `persona Account: is required`. |
| `404` `not_found` | The catalog has no such deception. |
| `422` `dns_not_configured` | The deception has a DNS honeytoken, but the console knows no zone of the DNS role. Set `NYKTUS_DNS_ZONES` for the console. |
| `422` `artifact_reveals_decoy` | An artifact would contain a word that reveals what it is, such as `canary` or the identifier of the deception. Nyktus checks every artifact it renders, because values it does not control reach them: the persona, the address of the trigger and the zone of the DNS role. Choose other values. A zone such as `canary.example.com` makes every DNS honeytoken suspicious. |

## What the files contain

Files rendered from the catalog never name Nyktus or what they are. The catalog rejects a template whose text contains words such as the product name, "honeytoken" or "decoy". Values that a tool interprets, such as the host names in an SSH configuration, can only be host names, account names, URLs of honeytokens or random values, so that no value can add a directive to the file. A file only causes a DNS lookup or an HTTP request. It never runs code on the system that opens it.

The catalog is public, so anyone can read its templates. Enter persona values that fit your environment, and adapt the files to the place where you put them.

## The catalog as a file

This documentation also serves the catalog as a file, [`/deception-catalog.json`](/deception-catalog.json), for readers that cannot reach the API of an installation, such as an AI assistant in a chat that helps you plan scenarios. It is generated from the catalog that a release embeds, and a test of that release keeps it equal to what its console returns. Like the API, it says what deceptions exist and nothing about the ones you use.

| Member | Content |
|---|---|
| `schema_version` | `1`, the version of the format of the file. |
| `license`, `notice` | The license of the deceptions, CC BY-SA 4.0, and the notices of the deceptions and of the names from MITRE ATT&CK and MITRE Engage. Keep them when you pass the file on. |
| `attack_version`, `engage_version` | The versions of ATT&CK and Engage that the identifiers come from. |
| `techniques`, `engage_activities` | The name of every technique and activity that the deceptions use, by identifier. |
| `deceptions` | By language, `en` and `de`, every deception as the API returns it, ordered by identifier. |

## Who can read the catalog

Every role reads the catalog, as do API keys with `catalog:read`. The catalog holds no inventory: it says which deceptions exist, not which ones you use.
