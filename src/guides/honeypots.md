---
title: Honeypots
description: Create a honeypot, know what it records, and read whether its sensor reports.
---

# Honeypots

A honeypot is a network service that nobody has a reason to connect to, such as an SSH server on a host the team never uses or a directory server that no application knows. The sensor `nyktus-sensor` emulates it inside your network. It answers like the real service, offers nothing behind the login, and reports every session to the trigger. This page covers the honeypot as the console manages it. Running the sensor is on [the sensor page](/guides/sensor).

## Choose a service

| Service | Emulates | Typical placement |
|---|---|---|
| `ssh` | An SSH server. | A jump host, or a server that admins would try with stolen credentials. |
| `telnet` | A Telnet login, as on network devices and old servers. | A switch, a printer or an appliance in a management network. |
| `postgres` | A PostgreSQL server. | A database host named in a configuration file or a connection string. |
| `ldap` | A directory server. | A domain controller, or a directory that tools look for when they map the network. |
| `mcp` | A server of the Model Context Protocol, through which AI agents find and call tools. | An internal knowledge base or tool that an intruder, or the AI agent they use, would query. |

A honeypot is one service on one address. To emulate several services of one host, create a honeypot for each and add them to the same scenario, so that their events become one incident. The console has no port for a honeypot: the sensor reports the port that was reached.

The service cannot be changed later, because the sensor is configured for it.

## Create one

Create a honeypot in the web console, or with [`POST /api/v1/honeypots`](/api/reference/honeypots#createHoneypot) from a script. Add `scenario_id` to create it in a [scenario](/guides/scenarios#add-decoys). The response holds two things the sensor needs:

- **The secret.** The sensor authenticates to the trigger with it: 256 random bits, 43 characters, with no prefix, so that nothing on the sensor host marks it as a decoy.
- **`sensor_config`.** The entry of this honeypot for the configuration file of the sensor: its identifier, its service, the usual port of the service (`:8080` for `mcp`, which has none) and the secret. It holds neither the name nor the notes, which have no place on the host of a sensor. For `mcp` it is a frame that you fill in, see [MCP](/guides/sensor#mcp).

Store both where the sensor reads them, such as a [secret file](/guides/sensor#secrets-in-files) that only the sensor's user can read. A secret that an attacker takes from the sensor host reveals only the honeypots configured there, because every honeypot has its own.

Name and notes say where the honeypot runs and why, for example `VLAN 20, rack 4, address 10.20.0.15`. Choose the severity and techniques as for a honeytoken.

### Severity

Every event of a honeypot receives its severity, whatever the attacker did, and an incident takes the highest severity of its events. A new honeypot has `medium` for every service, because a honeypot answers whoever connects, including the vulnerability scanners and inventory tools of your own team. Raise it for a honeypot that nothing in your network should ever reach, and exclude the addresses of honeypots from your own scanners where you can. A tool call of an `mcp` honeypot has no severity of its own: it receives the severity of the honeypot like a bare connection.

### Read the secret again

[`GET /api/v1/honeypots/<id>/secret`](/api/reference/honeypots#getHoneypotSecret) returns the secret and the `sensor_config` again, and the console has a button "Show the secret" on the page of a honeypot. Nyktus keeps the secret sealed with AES-256-GCM, so that you can configure a sensor later or by script, and it stands in plain text in the configuration of the sensor anyway.

- **Who may read it.** The permission `honeypots:write`, not `honeypots:read`: whoever holds the secret can report sessions in the name of the sensor. A `viewer` and a key with only `honeypots:read` get `403`. The response is sent with `Cache-Control: no-store`.
- **Audit.** Every read is recorded as `honeypot.secret_read`, never with the secret. If Nyktus cannot record the read, it sends no secret.
- **Keys.** The sealed secrets need the [encryption keys](/operate/configuration#encryption-keys). If a secret cannot be opened, or does not match its hash, the request fails with `500`, and the reason stands in the log of the console. Replacing the secret repairs it.

### Replace the secret

[`POST /api/v1/honeypots/<id>/secret`](/api/reference/honeypots#replaceHoneypotSecret) gives a honeypot a new secret, for example when the old one was lost or left on a host that was decommissioned. The new one is shown in the answer and can be read again. The old one stops working at once, so a sensor that still uses it is shut out until you configure it with the new one. The honeypot forgets what its sensor last reported, and its status is `never` until the sensor reports with the new secret. That shows you when the replacement has arrived.

## Status

The console shows whether a sensor reports for a honeypot:

| Status | Meaning |
|---|---|
| `never` | No sensor has reported with the current secret. The honeypot is new, its secret was replaced, or the sensor does not reach the trigger. |
| `online` | A sensor reported in the last 15 minutes. |
| `offline` | The last report is older than 15 minutes. The sensor stopped, lost its connection to the trigger, or no longer runs this honeypot. |

An offline honeypot raises no alert, because alerts belong to incidents and only attacker activity opens one. The metric `nyktus_honeypots` counts honeypots by status, so that your monitoring can tell you when a sensor stops.

## What a sensor reports

A sensor reports each session once, when it ends or after a short maximum delay, so that the first event of an incident says what the attacker did and not only that they connected. A report holds:

- the address of the attacker, the port they reached, when the session began and how long it lasted;
- up to six logins or binds, each with the user name, the **length** of the password, and for SSH the fingerprint of an offered key;
- for SSH the version string of the client, for PostgreSQL the database and application name, for LDAP the base and filter of the first search;
- for MCP the name and version that the client gave, and up to six tool calls, each with the name of the tool and the start of its arguments.

**A password is never sent and never stored**, only its length. A person who mistypes the address of a host in a terminal sends their own password to the honeypot; keeping nothing keeps that safe.

The sensor names neither the service, the severity nor the techniques. They come from the honeypot, and the server derives the kind of event from the content. Every text field is chosen by the attacker, so the trigger cuts it to its length and replaces characters that are not printable.

The trigger answers every report like any other `POST` to `/`, whether it was recorded or not, so the sensor learns nothing from the answer. Update the server before the sensors: a report with a version or a member that the server does not know is not stored. This holds for heartbeats as well, so a sensor that is newer than its server shows its honeypots as `offline`. A server takes the current version of a report and the one before it.

## What an event records

Every session reported for an enabled honeypot becomes one event. The kind is the highest stage the session reached:

| Kind | A session that | Techniques it suggests |
|---|---|---|
| `connection` | only connected | T1046 Network Service Discovery |
| `login_attempt` | tried to log in or bind | T1110 Brute Force; for `ssh` also T1021.004 Remote Services: SSH |
| `directory_query` | searched a directory (`ldap` only) | T1087.002 Account Discovery: Domain Account |
| `tool_call` | called a tool (`mcp` only) | T1213 Data from Information Repositories |

A session that reached several stages raises one event of the highest, so that a directory query is not hidden by the bind before it. The event also carries the techniques, the severity, the service and the scenario of the honeypot as they were when it arrived.

The event holds what the attacker typed. That is personal data, and it is untrusted: treat it as claims, not facts. It is readable by everyone who may read events for the length of the retention. Alerts, metrics and logs hold none of it.

::: danger Do not hand tool calls to an AI tool as instructions
The arguments of a tool call are often written by an AI agent, and they can be addressed to whatever reads them. If you pass events to an AI tool, for example to summarize an incident, you pass on the instructions of the attacker. Treat them as data, and give such a tool no permission that an attacker should not have.
:::

## Limits

- At most 10 events per honeypot and minute are stored. The sensor cannot see the limit; further sessions are counted and logged as `trigger: reports not recorded`.
- A session is stored once per `session_id` and honeypot, so a repeated report does not duplicate an event.
- A session of a disabled honeypot is not stored. Its heartbeats are, so that the console still shows whether its sensor runs.
- The body of a report is limited to 64 KiB.

## Retire a honeypot

[`DELETE /api/v1/honeypots/<id>`](/api/reference/honeypots#deleteHoneypot) deletes a honeypot and stops its secret from working. Its events remain. Stop the honeypot on the sensor as well, so that a service without a honeypot in the console does not mislead your own team.

## Who can read honeypots

Honeypots and their notes are part of the inventory: whoever reads them knows which addresses to avoid. Give integrations that do not manage honeypots API keys without the scopes `honeypots:read` and `honeypots:write`, and grant the role `viewer` only to people who need to see the decoys. See [Authentication](/api/authentication#choosing-scopes).
