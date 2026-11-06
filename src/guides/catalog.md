---
title: Deception catalog
description: Choose a deception, apply it to create a scenario, and know what its example files can and cannot give away.
---

# Deception catalog

The catalog holds the deceptions that ship with Nyktus. A deception is a guide: it tells a story, such as remote access files whose server names are DNS honeytokens, says which honeytokens and honeypots the story needs, and offers example files to adapt and place. This page helps you choose one, apply it, and understand what its files give away.

The catalog is part of the server binary and the same in every installation. Nyktus checks it when the console starts, and a server whose catalog does not validate does not start. Nothing is loaded at runtime, and the catalog contains no executable code. New deceptions come with new releases. To add your own, put them into `catalog/` of the source and build Nyktus yourself, as `catalog/README.md` of the repository describes.

## What a deception holds

The [catalog reference](/guides/catalog-reference) lists every deception. The console shows the same and applies a deception with a form.

[`GET /api/v1/catalog/deceptions`](/api/reference/catalog#listCatalogDeceptions) returns the whole list, ordered by identifier and not paged, with the summary of each deception. [`GET /api/v1/catalog/deceptions/<id>`](/api/reference/catalog#getCatalogDeception) returns one in full. Texts are English; add `?lang=de` for German.

| Field | Meaning |
|---|---|
| `category` | What the deception pretends to be: `identity`, `network`, `data`, `endpoint`, `application` or `cloud`. |
| `techniques` | The MITRE ATT&CK techniques that a trigger of the deception suggests. |
| `engage_activities` | The activities of MITRE Engage that the story carries out, such as `EAC0005` (Lures) and `EAC0011` (Pocket Litter). |
| `guide` | The instruction in Markdown, with the sections `Story`, `Setup`, `Testing`, `Limits` and, where something stays behind in a system, `Removing`. |
| `honeytokens` | The slots for honeytokens: for each a `label`, the `type` it needs, and the techniques and severity it receives when you create it by applying the deception. A deception raises the severity above the default of the type for a honeytoken that nobody but an intruder has a reason to use. |
| `honeypots` | The slots for honeypots: for each a `label` and the `service` it needs. |
| `files` | The example files, each with its `name`, its `format` and its `size` in bytes. |

A slot only names what the story needs. It binds nothing: Nyktus does not remember which honeytoken you created for which slot, so the scenario lists its honeytokens and honeypots once, not per deception.

## Example files

The files are static text that the catalog holds. Nyktus fills in nothing, generates nothing and stores nothing when you use a deception. [`GET /api/v1/catalog/deceptions/<id>/files/<name>`](/api/reference/catalog#downloadCatalogDeceptionFile) returns a file as an attachment with its name:

```sh
curl --fail-with-body --remote-header-name --remote-name \
  --header "Authorization: Bearer $NYKTUS_API_KEY" \
  "<console-url>/api/v1/catalog/deceptions/remote-access/files/wg0.conf"
```

The answer carries the headers `Content-Disposition: attachment; filename=wg0.conf`, `Content-Type: application/octet-stream` (files that a tool reads come as `application/octet-stream`), `Content-Security-Policy: default-src 'none'; sandbox`, `X-Content-Type-Options: nosniff` and `Cache-Control: no-store`. The file is what the catalog holds, with the placeholder in it.

A file is not an inventory and not private. Three things follow, and you do them by hand:

- **Replace the placeholder.** A honeytoken stands as `Honeytoken-Domain` for a DNS honeytoken and `Honeytoken-URL` for a URL or an image. If a deception asks for several honeytokens of one kind, the placeholder carries the name of its slot, such as `Honeytoken-Domain-Server`, and the `Setup` section of the guide says which placeholder belongs to which honeytoken. The value to enter stands on the page of the scenario.
- **Change names and passwords.** The names and passwords in a file are the same in every installation, and the catalog is public. Anyone can look a password up. Adapt them to your environment before you place the file, and do not reuse a real one.
- **Adapt the file to its place.** Dates, owner and location are yours, see [Placement](/security/stealth#files-and-placement).

The web console never opens a file. It saves it for you, because a file of the format `html` would otherwise run in the origin of the console. The headers above keep a browser from rendering it for the same reason. Downloads are not recorded in the audit log, because the catalog holds no inventory.

A script that creates accounts, such as those of [the decoy accounts](/guides/catalog-reference#ad-decoy-accounts), is part of the guide and not a file. It generates its passwords itself when it runs.

## Apply a deception

Applying a deception creates a scenario that holds its identifier. This request applies `remote-access` and creates the scenario only:

```sh
curl --fail-with-body --request POST \
  "<console-url>/api/v1/catalog/deceptions/remote-access/apply" \
  --header "Authorization: Bearer $NYKTUS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name": "Admin workstation ws07", "language": "en"}'
```

The key needs `scenarios:write`. The response has the status `201`. It holds the `scenario`, and the lists `honeytokens` and `honeypots` of what the request created, which are empty here. The identifiers and times differ in your installation:

```json
{
  "scenario": {
    "id": "bdcb387d-942a-4140-a879-4feb55f52d86",
    "name": "Admin workstation ws07",
    "notes": "",
    "engage_activities": ["EAC0005", "EAC0011", "EAC0022"],
    "deceptions": [
      {"deception_id": "remote-access", "created_at": "2026-11-06T17:38:40.430093Z"}
    ],
    "created_at": "2026-11-06T17:38:40.427945Z",
    "updated_at": "2026-11-06T17:38:40.430525Z"
  },
  "honeytokens": [],
  "honeypots": []
}
```

- `name` and `notes` name the new scenario, with the rules of a [scenario](/guides/scenarios).
- `language` is `en` by default, or `de`. It sets the language of the names of the resources that the request creates. The guide is shown in the language you ask for when you read it.
- `create_resources` is `false` by default. With `true`, Nyktus also creates the honeytokens and honeypots of the slots, named after their labels, and adds them to the scenario. The key then needs `honeytokens:write` and `honeypots:write` as well, whatever the deception asks for. Without them the request gets `403` before anything is loaded. A honeypot comes without its secret, which [`GET /api/v1/honeypots/<id>/secret`](/api/reference/honeypots#getHoneypotSecret) returns.

Everything is created together or not at all. The scenario gains the Engage activities of the deception.

What you do next is in the guide: create the honeytokens, replace the placeholders in the files, place them and record where. [Scenarios](/guides/scenarios#work-through-a-deception) describes the steps.

The scenario keeps only the identifier of the deception. Its guide, slots and files are read from the catalog when they are shown. A later release with a changed catalog therefore changes what every scenario that holds the deception shows. A deception that a release removed stays in the scenario as an identifier, and the console says that the catalog no longer knows it.

### What can go wrong

| Status and code | Reason |
|---|---|
| `400` `invalid_request` | A field is invalid. The message names it. |
| `403` `forbidden` | `create_resources` is `true` and the key lacks `honeytokens:write` or `honeypots:write`. |
| `404` `not_found` | The catalog has no such deception. |
| `422` `dns_not_configured` | `create_resources` is `true`, the deception has a DNS honeytoken, and the console knows no zone of the DNS role. Set `NYKTUS_DNS_ZONES` for the console. |

## What the files contain

The catalog never names Nyktus and carries no identifier of it. It rejects an example file whose name or text contains the product name, "honeytoken", "honeypot", "decoy", "deception", "canary", a short form of a Creative Commons license or the identifier of its deception, apart from the placeholders. Guides are read by you and may say what the deception is. A file only causes a DNS lookup or an HTTP request when a program uses it. It never runs code on the system that opens it.

What the catalog cannot hide is that it is public. Anyone can read the example files, so an intruder who knows the project can recognize a file that you placed unchanged. Adapt the names and the passwords, and place the file where it fits.

## The catalog as a file

This documentation also serves the catalog as a file, [`/deception-catalog.json`](/deception-catalog.json), for readers that cannot reach the API of an installation, such as an AI assistant in a chat that helps you plan scenarios. It is generated from the catalog that a release embeds, and a test of that release keeps it equal to what its console returns. Like the API, it says what deceptions exist and nothing about the ones you use.

| Member | Content |
|---|---|
| `schema_version` | `3`, the version of the format of the file. |
| `license`, `notice` | The license of the deceptions, CC BY-SA 4.0, and the notices of the deceptions and of the names from MITRE ATT&CK and MITRE Engage. Keep them when you pass the file on. |
| `attack_version`, `engage_version` | The versions of ATT&CK and Engage that the identifiers come from. |
| `techniques`, `engage_activities` | The name of every technique and activity that the deceptions use, by identifier. |
| `deceptions` | By language, `en` and `de`, every deception as `GET /api/v1/catalog/deceptions/<id>` returns it, ordered by identifier. Each file also holds its `content`. |

## Who can read the catalog

Every role reads the catalog, as do API keys with `catalog:read`. The catalog holds no inventory: it says which deceptions exist, not which ones you use.
