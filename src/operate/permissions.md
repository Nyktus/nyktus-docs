---
title: Roles and permissions
description: What each role of an account and each scope of an API key allows, in one table.
---

# Roles and permissions

Every operation of the console API requires one permission. A signed-in user holds the permissions of their role. An API key holds the scopes it was created with, and only those that keys may carry. This page lists both side by side, so that you can pick a role for a person and scopes for an integration without reading six pages.

## The permissions

A permission has the form `resource:action`. `read` reads, and `write` creates, changes and deletes.

| Resource | `admin` | `user` | `viewer` | API key |
|---|---|---|---|---|
| Honeytokens | read, write | read, write | read | `honeytokens:read`, `honeytokens:write` |
| Honeypots | read, write | read, write | read | `honeypots:read`, `honeypots:write` |
| Scenarios | read, write | read, write | read | `scenarios:read`, `scenarios:write` |
| Incidents | read, write | read, write | read | `incidents:read`, `incidents:write` |
| Events | read | read | read | `events:read` |
| Deception catalog | read | read | read | `catalog:read` |
| Audit log | read | | | `audit:read` |
| Metrics | read | | | `metrics:read` |
| Alert channels and their deliveries | read, write | | | never |
| Accounts | read, write | | | never |
| API keys | read, write | | | never |

Notes on the table:

- **`write` on incidents** is triage: acknowledge, close, add notes, override the severity and the techniques. A `viewer` cannot triage.
- **Applying a deception,** **adding one to a scenario** and **removing one** need `scenarios:write`. With `create_resources` they also need `honeytokens:write` and `honeypots:write`, whatever the deception asks for. **Creating a honeytoken or a honeypot in a scenario** and **putting one into a scenario** need `honeytokens:write` or `honeypots:write` instead, because the decoy changes and the scenario does not. Deleting a scenario together with its honeypots needs `scenarios:write` and `honeypots:write`.
- **Reading the secret of a honeypot** needs `honeypots:write`, not `honeypots:read`, because whoever holds the secret can report sessions in the name of the sensor. A `viewer` cannot read it. Every read is audited.
- **Keys never manage** alert channels, accounts or API keys, not even to read them. A leaked key with one of these could redirect the alerts, take over accounts or issue itself a successor.
- **Reading deliveries of an alert** (`GET /api/v1/incidents/<id>/deliveries`) needs `incidents:read`. Managing channels and retrying a delivery need a session of an administrator.

## Scopes that depend on others

A scope to change a resource requires the scope to read it, because a key that changes a resource receives it in the responses. These pairs are the only dependencies:

| Scope | Requires |
|---|---|
| `honeytokens:write` | `honeytokens:read` |
| `honeypots:write` | `honeypots:read` |
| `scenarios:write` | `scenarios:read` |
| `incidents:write` | `incidents:read` |

Nyktus rejects a key whose scopes break one of these rules. See [Choosing scopes](/api/authentication#choosing-scopes) for what to give an integration.

## Operations of your own account

Every signed-in user, whatever the role, may sign out, change their own password and manage their own second factor. These operations belong to the session and carry no permission. An account of the identity provider has no password and no second factor in Nyktus.

## Actions that ask for the password again

Creating an API key, removing the second factor of another account, and creating or changing an alert channel other than renaming it require a fresh authentication, in addition to the permission. See [Confirming sensitive actions](/operate/sign-in#confirming-sensitive-actions).

## Who should have which role

- **`admin`:** the few people who run the installation. An administrator manages accounts, keys and alert channels, and reads the audit log. Give it a [second factor](/operate/sign-in#second-factor).
- **`user`:** the people who place decoys and triage incidents.
- **`viewer`:** people who only need to see incidents and decoys. A `viewer` reads honeytokens, honeypots and their notes, which tell where decoys are placed, and events with client addresses. Grant it only to people who need that.

With an [identity provider](/operate/sign-in#identity-provider), the groups of the provider decide the role. See [Accounts](/operate/users) for how accounts are created and changed.
