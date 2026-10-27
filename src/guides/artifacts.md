---
title: Artifacts
description: The files that a scenario holds. Download them, record where you placed them, and find them again.
---

# Artifacts

An artifact is a file that Nyktus renders from a template of the catalog for a scenario, when you apply a deception or add the artifact later, such as an SSH configuration that names a DNS honeytoken, or a Windows shortcut to the URL of a honeytoken. You place it where an intruder looks. An artifact raises no event itself. The honeytokens it names do, when someone uses the file.

The honeytokens that fill its slots make the difference. An artifact with a bound honeytoken is a lure. An artifact without one is pocket litter: it gives the story a believable surrounding, such as a note beside the lure, and raises no event, whatever happens to it. Place pocket litter beside a lure, not instead of one.

Nyktus stores artifacts so that you can download them again, see where you placed them, and find them when you clean up. They outlive their scenario when you delete the scenario and keep them.

## What an artifact holds

| Field | Content |
|---|---|
| `scenario_id` | The scenario the artifact was created in, or `null` once the scenario was deleted and the artifact kept. |
| `catalog_artifact` | The identifier of the artifact in the [catalog](/guides/catalog#artifacts-of-the-catalog), such as `ssh-config`. |
| `file_name` | The name under which the file is downloaded. |
| `format` | `text` or `markdown` for files that a person reads, `html` for a page that a browser opens, `config` for a file that a tool reads, such as an SSH configuration, a `.netrc` or a shortcut. |
| `media_type` | The media type of the download. |
| `size` | The length of the content in bytes, at most 1 MiB. |
| `placing` | Where to place the file, as the catalog says it, rendered for the scenario. Empty if the catalog says nothing. |
| `bindings` | The honeytokens that fill its slots, by the key of the slot. A slot without an entry is empty, which makes the file pocket litter. The honeytoken may have been deleted since. |
| `placement_notes` | Where you placed the file. |

[`GET /api/v1/artifacts?scenario_id=<scenario-id>`](/api/reference/artifacts#listArtifacts) lists the artifacts of a scenario, without their content.

## Download an artifact

```sh
curl --fail-with-body --remote-name --remote-header-name \
  "<console-url>/api/v1/artifacts/<id>/content" \
  --header "Authorization: Bearer $NYKTUS_API_KEY"
```

The file is what Nyktus rendered, including the passwords and other secrets it generated. It never changes: a later release with a changed catalog does not render it again. Secrets exist only in the artifact, so download it before you delete anything. Every artifact generates its own, so a password in one file is not the one in another file of the same scenario.

The file arrives as an attachment with the media type of its format. Files that a tool reads come as `application/octet-stream`. The response carries `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'none'; sandbox`, so a browser saves an HTML artifact instead of showing it, and one that shows it anyway runs no script and loads nothing. Line endings are those the file needs, such as CRLF for Windows shortcuts.

The web console never opens an artifact. It saves the file for you and shows text, Markdown and HTML only as text, because an HTML file would otherwise run with the rights of your session.

## Record where you placed it

```sh
curl --fail-with-body --request PATCH "<console-url>/api/v1/artifacts/<id>" \
  --header "Authorization: Bearer $NYKTUS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"placement_notes": "~/.ssh/config of the account svc_backup on jump01"}'
```

Placement notes hold up to 2000 characters, with line breaks and tabs. An empty string removes them. They are the only thing about an artifact that you can change: its content, name and format are what was rendered, and it leaves its scenario only when the scenario is deleted. Record every place, so that the file can be found and removed when the scenario ends.

Placement itself, including what the file's name, dates and owner give away, is covered in the [stealth considerations](/security/stealth#artifacts-and-placement). The guide of each scenario says where its artifacts fit.

## Delete an artifact

[`DELETE /api/v1/artifacts/<id>`](/api/reference/artifacts#deleteArtifact) deletes the stored file. It does not remove the file from where you placed it, and the honeytokens it names keep recording until you delete them. Delete the artifact, its placed copies and its honeytokens together.

## Who can read artifacts

An artifact names the URLs and host names of honeytokens, so it is part of the inventory. API keys carry `artifacts:read` and `artifacts:write`, and `artifacts:read` requires `honeytokens:read`. Give integrations that do not manage decoys keys without them. See [Authentication](/api/authentication#choosing-scopes).
