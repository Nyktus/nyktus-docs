---
title: Authentication
description: Sessions, API keys, scopes and what an integration should be allowed to do.
---

# Authentication

An integration calls the API with an API key. A person uses the web console, which signs in with a session. This page explains how a key works and how to choose its scopes, so that a leaked key gives away as little as possible.

## Sessions and keys

| | Session | API key |
|---|---|---|
| For | The web console in a browser. | Scripts, a SIEM, a ticket system, CI/CD. |
| Sent as | A cookie that `POST /api/v1/session` sets, or the sign-in through your identity provider. | `Authorization: Bearer <key>` |
| Acts as | The signed-in user, with the permissions of their role. | The team, with the scopes of the key, whoever created it. |

A request with a key authenticates with the key alone, even if it carries a cookie. Other credentials in the `Authorization` header, such as the Basic credentials of a reverse proxy, are ignored.

A request that changes state and carries an `Origin` header must come from the origin of the console, otherwise it receives `403` with the code `cross_origin`. A script that sends no `Origin` header is not affected. A browser that reaches the console under another address than `NYKTUS_CONSOLE_URL` gets this answer for every such request.

Some operations admit sessions only. A key that calls one receives `403`. Keys never manage accounts, API keys or alert channels, not even to read them: a key that could manage the channels could redirect or stop the alerts. Every operation in the reference states whether a key may call it.

## Creating a key

Only administrators create keys, and only while signed in with a session. They confirm the request with their password, or sign in again at the identity provider within the five minutes before. A key outlives the session that created it, which is why the confirmation is required.

- **The secret is shown once.** Nyktus keeps only a hash of it. Copy it from the response; a lost key cannot be recovered, only replaced.
- **Every key expires.** The day is required, from tomorrow to just under three years ahead, counted in UTC. The key stops working at the start of that day. Choose a period that fits your rotation policy. Nyktus does not remind anyone before a key expires.
- **There is a limit.** A team has at most 50 keys that have not expired.
- **The form.** A key starts with `nyk_` followed by 84 characters, so a secret scanner can recognize a leaked one by its prefix.

Store a key like a password: in the secret store of the integration, never in a repository or in a URL.

## Choosing scopes

A key holds the scopes you select and nothing else, whatever role its creator has. Give each integration the scopes it needs.

| Scope | Allows |
|---|---|
| `incidents:read`, `incidents:write` | Reading and triaging incidents. |
| `events:read` | Reading events, which contain personal data such as client addresses. |
| `audit:read` | Reading the audit log. |
| `metrics:read` | Reading the metrics, for a monitoring system. |
| `catalog:read` | Reading the deception catalog, which holds no inventory. |
| `honeytokens:read`, `honeytokens:write` | Reading and managing honeytokens, for example to roll them out by script. |
| `honeypots:read`, `honeypots:write` | Reading and managing honeypots, including replacing their secrets. |
| `scenarios:read`, `scenarios:write` | Reading and managing scenarios. |
| `artifacts:read`, `artifacts:write` | Reading and downloading artifacts, and keeping their placement notes or deleting them. |

A scope to write requires the scope to read the same resource, because a key that changes a resource receives it in the responses. `scenarios:read` and `artifacts:read` also require `honeytokens:read`, because the guide of a scenario and the content of an artifact name the URLs and host names of honeytokens.

Honeytokens, honeypots, scenarios and artifacts are the inventory: whoever reads them knows which URLs and hosts to avoid. Keep them away from integrations that only follow incidents:

- A SIEM that collects alerts needs `incidents:read` and, if it should show the client address, `events:read`. Leave out every scope of the inventory.
- A script that rolls out decoys needs `honeytokens:write`, which brings `honeytokens:read`, and the scopes of the other resources it creates.
- Leave out `events:read` from every integration that does not need client addresses.

## Revoking a key

`DELETE /api/v1/api-keys/<id>` revokes a key. It stops working with the next request. Keys stay valid when the administrator who created them leaves or is deactivated, so review the keys of the team when people leave or integrations change. If you cannot tell which key leaked, revoke every key that might be affected.

## What the audit log records

A key is an actor of its own in the audit log, with the method `api_key`, its identifier and a copy of its name, which stays readable after the key is revoked. Creating a key is recorded as `api_key.create` with the administrator as actor, a revocation as `api_key.revoke`. A request that a key makes without the required permission is recorded at most once per minute and key. A request with an invalid key is not in the audit log; the access log of the console records it.
