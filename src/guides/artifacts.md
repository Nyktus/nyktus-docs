---
title: Artifacts
description: The files that applying a deception renders. Download them, record where you placed them, and find them again.
---

# Artifacts

An artifact is a file that applying a deception renders for its scenario, such as an SSH configuration that names a DNS honeytoken, or a Windows shortcut to the URL of a honeytoken. You place it where an intruder looks. An artifact raises no event itself. The honeytokens it names do, when someone uses the file.

Nyktus stores artifacts so that you can download them again, see where you placed them, and find them when you clean up. They outlive their scenario when you delete the scenario and keep them.

## What an artifact holds

| Field | Content |
|---|---|
| `scenario_id` | The scenario that applying the deception created, or `null` once the scenario was deleted and the artifact kept. |
| `deception_artifact` | The key of the file in its deception, such as `config`. |
| `file_name` | The name under which the file is downloaded. |
| `format` | `text` or `markdown` for files that a person reads, `html` for a page that a browser opens, `config` for a file that a tool reads, such as an SSH configuration, a `.netrc` or a shortcut. |
| `media_type` | The media type of the download. |
| `size` | The length of the content in bytes, at most 1 MiB. |
| `placement_notes` | Where you placed the file. |

[`GET /api/v1/artifacts?scenario_id=<scenario-id>`](/api/reference/artifacts#listArtifacts) lists the artifacts of a scenario, without their content.

## Download an artifact

```sh
curl --fail-with-body --remote-name --remote-header-name \
  "<console-url>/api/v1/artifacts/<id>/content" \
  --header "Authorization: Bearer $NYKTUS_API_KEY"
```

The file is what applying the deception rendered, including the passwords and other secrets it generated. It never changes: a later release with a changed catalog does not render it again. Secrets exist only in the artifact, so download it before you delete anything.

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
