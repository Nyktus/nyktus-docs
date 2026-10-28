---
title: Alerting
description: Set up alert channels, understand what a message holds and how delivery is retried, and test a channel.
---

# Alerting

An incident raises a single alert when it opens, and Nyktus delivers that alert to every enabled alert channel. This page helps you set up the channels, shows what a message holds, and explains what happens when a delivery fails.

## Alert channels

Most channels are a URL that receives an HTTP `POST` for every alert. A channel of the type `email` sends mail instead.

| Type | Receiver |
|---|---|
| `webhook` | Any receiver of JSON, such as a SOAR platform, a SIEM or an automation tool. It can send one additional header, for receivers that expect a token in a header. |
| `slack` | An incoming webhook of Slack. |
| `teams` | A workflow of Microsoft Teams that posts to a channel ("Post to a channel when a webhook request is received"). The retired Office 365 connectors are not supported. |
| `email` | 1 to 10 addresses, through the SMTP server of the operator. |

Only administrators manage channels, and only with a session. API keys never manage channels, because a leaked key could redirect the alerts or stop them. An installation has at most 20 channels.

A channel that you create or enable later does not receive the alerts of incidents that opened before. If no channel is enabled when an incident opens, the worker logs `alerting: no enabled channel`, and the incident is still in the API.

### The URL is a secret

Whoever knows the URL of a Slack or Teams webhook can post into the channel, and many receivers accept requests by a token in the URL. Nyktus therefore treats the whole URL, with its path and query, and the value of a webhook's header as secrets:

- They are stored encrypted with the encryption keys, bound to their channel, and never logged.
- They are never returned, not even in the response that creates the channel. A channel shows only `target`, the scheme, host and port of its URL, and the name of its header.
- The console can write them, but its database role cannot read them back. To change one, enter it again.

Keep a copy in your secret store if you need it elsewhere.

### Allowed targets

Every URL must use `https` and point to a host that resolves to public addresses only. Nyktus checks this when a channel is saved and again whenever it connects, so that a name that resolves to an internal address later is still refused. It rejects loopback, private, link-local and cloud metadata addresses, and names that are internal by convention, such as `localhost`, single labels and names under `.local` or `.internal`. A target that is not allowed gets `422` with the code `target_not_allowed`, which does not tell an internal target from one that does not resolve.

To deliver to a receiver in one of your internal networks, such as a self-hosted SOAR platform, allow its network with `NYKTUS_ALERTING_ALLOWED_NETWORKS`, a comma-separated list in CIDR notation. Set the same list for the console and the worker. This never opens loopback, link-local or metadata addresses. Names under `.local` and `.internal` and single labels are accepted then.

Any port is allowed, because self-hosted receivers often listen on their own, such as `8088` for the HTTP Event Collector of Splunk. An administrator could thereby make Nyktus connect to an arbitrary port of a public host. This is accepted: the request carries only the alert, Nyktus follows no redirect and never shows the response.

## Create a channel

Creating a channel is confirmed with the administrator's password, as is every change other than renaming it. An administrator who signs in through an identity provider has no password and signs in there again first. Write the request into a file, so that the URL and the password stay out of your shell history:

```json
{
  "name": "SOAR",
  "type": "webhook",
  "url": "https://soar.example.com/hooks/nyktus",
  "header": {"name": "Authorization", "value": "Bearer <token>"},
  "password": "<your password>"
}
```

```sh
curl --fail-with-body --json @channel.json --cookie cookies.txt "<console-url>/api/v1/alert-channels"
```

A channel of the type `email` has recipients instead of a URL:

```json
{
  "name": "SOC mailbox",
  "type": "email",
  "recipients": ["soc@example.com"],
  "password": "<your password>"
}
```

- **Name:** 1 to 64 characters, unique.
- **URL** for every type but `email`, **recipients** only for `email`. A mismatch gets `422` with `url_not_allowed` or `recipients_not_allowed`.
- **Header** only for a `webhook`. Its name may be any header name except those that the client sets itself or that change how the request is transferred, such as `Host`, `Content-Length`, `Content-Type`, `Transfer-Encoding`, `Connection`, `Upgrade` and `Proxy-*`. Its value has at most 1024 printable ASCII characters.

### Change and delete

[`PATCH /api/v1/alert-channels/<id>`](/api/reference/alerting#updateAlertChannel) changes `name`, `enabled`, `url`, `header` or `recipients`. `"header": null` removes the header, and `recipients` replaces the list. The type never changes: create a new channel instead.

Every change other than a new `name` decides where alerts go, what authenticates them, or whether they go at all, so it needs the password. That includes enabling a channel again, because its URL or the domain of its recipients may have changed hands since, for example with a lapsed domain. A taken-over session can therefore neither silence nor redirect the alerts without the password.

Only a disabled channel can be deleted. An enabled one gets `409` with the code `alert_channel_enabled`.

### Mail

Recipients are addresses of the form `local@domain` in ASCII, without display name, comment or quoting, none twice. Write an internationalized domain in its ASCII form (`xn--…`). Unlike a webhook URL, an address grants nothing to whoever knows it, so it is no secret. It is stored as it is, returned by the API, and may appear in the log of the worker.

Addresses that name a person are personal data. Prefer the address of a team or a distribution list, which also keeps alerts flowing when people leave.

The worker sends mail through the SMTP server you configure with `NYKTUS_SMTP_HOST`. The console accepts an `email` channel without it, because it does not know the configuration of the worker. Its deliveries are then dead with the class `not_configured`, and the worker warns `worker: email channels without smtp server` when it starts. Send a test after you create a channel.

Whether the mail reaches the inbox is up to your mail server. It signs the mail (DKIM), and the domain of `NYKTUS_SMTP_FROM` must allow it to send (SPF, DMARC). Use an address of its own as the sender, so that receivers can filter on it, and make sure the mail of Nyktus is not held in a spam quarantine.

## What a message holds

A message names the scenario, honeytoken or honeypot by its identifier only. It holds neither its name nor its notes, which are inventory, nor anything of the events, such as client addresses or what an attacker typed, because messages often go to services of third parties. Fetch the details through the API with a key that has `incidents:read` and `events:read`: `GET /api/v1/incidents/<id>` and `GET /api/v1/events?incident_id=<id>`.

### Webhook

A webhook receives JSON:

```json
{
  "version": 1,
  "type": "alert",
  "delivery_id": "6f1d2c1e-8f0a-4f5b-9a4e-1c2b3d4e5f60",
  "incident": {
    "id": "0b9e7a52-3c1d-4e8f-a6b2-7d4c5e6f7a8b",
    "url": "https://nyktus.example.com/incidents/0b9e7a52-3c1d-4e8f-a6b2-7d4c5e6f7a8b",
    "severity": "medium",
    "techniques": ["T1078"],
    "resource_type": "honeytoken",
    "resource_id": "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    "opened_at": "2026-10-15T10:00:01Z",
    "first_event_at": "2026-10-15T10:00:00Z"
  }
}
```

- `version` changes only when a member changes its meaning or disappears. New members may appear within a version, so ignore members you do not know.
- `severity` and `techniques` are those of the incident when it opened, as the alert keeps them.
- `resource_type` is `scenario`, `honeytoken` or `honeypot`. Further types may appear within a version, so handle a value you do not know like any other resource.
- A test sends `{"version": 1, "type": "test", "delivery_id": "…"}`.

### Slack and Teams

Slack and Teams receive a message for people: the title "Nyktus: incident opened", the severity, the techniques, the resource by its identifier, the time of the first event, the identifier of the delivery and a link to the incident. A test posts "Nyktus: test message".

- **Slack:** create an incoming webhook for the channel and use its URL, `https://hooks.slack.com/services/…`.
- **Teams:** in the channel, create a workflow from the template "Post to a channel when a webhook request is received" and use the URL it shows. The message is an adaptive card with a button that opens the incident.

### Email

A channel of the type `email` receives plain text in ASCII with the subject "Nyktus: incident opened (severity)":

```text
An incident opened in Nyktus.

Severity:    medium
Techniques:  T1078
Resource:    honeytoken 9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d
First event: 2026-10-15T10:00:00Z

Open the incident: https://nyktus.example.com/incidents/0b9e7a52-3c1d-4e8f-a6b2-7d4c5e6f7a8b

Delivery 6f1d2c1e-8f0a-4f5b-9a4e-1c2b3d4e5f60
```

It holds no more than a chat message does, and not the name of the channel. The `Message-ID` is the identifier of the delivery at the domain of the sender, so that a mail sent twice can be recognized, and `Auto-Submitted: auto-generated` keeps automatic replies, such as out-of-office notes, from answering it.

### Authenticating the messages

Nyktus does not sign messages. A receiver tells messages of Nyktus from others by a secret it chose: a token in the URL, as with Slack, Teams and most automation tools, or in the header of the webhook, such as `Authorization: Bearer <token>`. HTTPS keeps it from third parties on the way. A signature would protect only the receiver against forged alerts, which a token prevents as well, and most receivers check a token and not a signature.

## Delivery

The worker delivers the alerts. When an incident opens, it creates a delivery for every enabled channel in the same transaction, so an alert is never left without its deliveries. Each delivery is attempted on its own, so a channel that fails or answers slowly never holds up the others. Every request:

- is a `POST` with the body of the channel's type, sent through the guard against requests to internal addresses, which checks every address it connects to,
- follows no redirect and ignores `HTTP_PROXY` and `HTTPS_PROXY`,
- ends after 10 seconds,
- counts as delivered if the receiver answers `2xx`. The response is read and discarded, never stored or logged.

Mail goes to your SMTP server in a conversation of its own for every delivery. The worker connects with TLS as configured and verifies the certificate. The server must accept every recipient, and if it refuses one, the worker sends nothing, so that a mail never reaches only some of them. A mail counts as delivered once the server has accepted it. What happens afterwards is beyond the sight of Nyktus.

**At least once.** A delivery reaches its receiver at least once. If the worker stops or loses the database after the receiver accepted a message but before it recorded that, it sends the message again later. A receiver that acts on alerts, such as a SOAR platform, should ignore a `delivery_id` it has seen. A mail sent again has the same `Message-ID`.

### Retries

| Outcome of an attempt | What follows |
|---|---|
| `2xx` | Delivered. |
| Other `5xx`, `408`, a timeout, a failed connection or TLS handshake | Tried again after 30 seconds, then after twice the previous wait, up to an hour. |
| `429`, `503` | Tried again as above, or after the `Retry-After` wait if the receiver names a longer one, at most an hour. |
| Any other `4xx`, a redirect, a target that resolves to a blocked address, a secret that cannot be decrypted | Dead at once, because no retry can mend it. |
| Mail: a `4xx` reply of the SMTP server, or a server without STARTTLS | Tried again as above. |
| Mail: a `5xx` reply, such as a refused recipient or a failed authentication, no configured SMTP server, or a server that offers no authentication although a username is configured | Dead at once. |

After 10 attempts, the last about three hours after the first, a delivery is dead. A delivery whose channel was disabled or deleted before it was sent is `canceled`. The worker logs every failed attempt as `alerting: delivery failed` and a dead delivery as `alerting: delivery dead`, with the class of the failure and the status code, never the URL, the response or the password of the SMTP server.

### Read and retry deliveries

[`GET /api/v1/incidents/<id>/deliveries`](/api/reference/incidents#listIncidentDeliveries) lists the deliveries of an incident's alert, for every user who reads incidents and for keys with `incidents:read`. Each names its channel, its `status` (`pending`, `delivered`, `dead` or `canceled`), the number of `attempts`, the time of the next attempt while it is pending, and the last attempt: when it was, the `last_status_code` of the response or the reply code of a mail refusal, the class of the failure in `last_error`, and how long it took.

Once the receiver is fixed, an administrator delivers a dead alert again with a session:

```sh
curl --fail-with-body --request POST --cookie cookies.txt "<console-url>/api/v1/alert-deliveries/<id>/retry"
```

It starts again with a new count of attempts. The audit log records it as `alert_delivery.retry`. Deliveries are kept as receipts, as long as their incident.

## Test a channel

[`POST /api/v1/alert-channels/<id>/test`](/api/reference/alerting#testAlertChannel) asks the worker to send a test message, also to a disabled channel, so that you can try it before it receives alerts. The response is `202` and names the delivery. Read its outcome with `GET /api/v1/alert-deliveries/<id>` a few seconds later. A test is attempted once, and a channel has at most one test waiting (`409`, `test_pending`). The worker sends the test, not the console, so that only the worker needs to reach the receivers and the answer of the console reveals nothing about your network.

An `email` channel on an installation without `NYKTUS_SMTP_HOST` shows what a failed test looks like:

```json
{
  "channel_type": "email",
  "status": "dead",
  "attempts": 1,
  "last_status_code": null,
  "last_error": "not_configured"
}
```

## Encryption keys

Channels of the type `email` have no secrets. The worker decrypts the secrets of the other channels with the encryption keys and refuses to start if a secret was encrypted with a key that is not listed. After you put a new key first, the next delivery to a channel encrypts its secrets again with it. To retire the old key sooner, enter the URL and header of the remaining channels again.
