---
title: Honeytokens
description: Choose a type, create a honeytoken, place it, and know what Nyktus records when it fires.
---

# Honeytokens

A honeytoken is a URL or host name that nobody has a reason to open or resolve. You place it where only an intruder would look, for example as a link in a document on a file share, as an image in a mail template or as a host in a configuration file. Nyktus records an event when it is requested or resolved, and events become [incidents](/guides/incidents) that raise an [alert](/guides/alerting). This page helps you choose the type, create the honeytoken, place it and read what it records.

## Choose a type

| Type | Fires when | Typical placement |
|---|---|---|
| `web_url` | The URL is opened, for example by a click. | A link in a document, a wiki page, a bookmark or a configuration file, or a QR code. |
| `web_image` | The URL is loaded as an image. | An image in a document, a mail or an HTML page, which the viewer loads when it opens it. |
| `dns` | One of its host names is resolved. | A host in an SSH configuration, a connection string, a VPN profile or a script. See [DNS honeytokens](/guides/dns-honeytokens). |

A QR code is a `web_url` shown as a QR code. The console shows the code when you create the honeytoken; to make your own, encode its `trigger_url`.

A `web_url` redirects the browser after the request, so that a click lands on a page instead of an error. You choose the target with `redirect_url`.

The type cannot be changed later.

## Create one

Create a honeytoken in the web console, or with [`POST /api/v1/honeytokens`](/api/reference/honeytokens#createHoneytoken) from a script. The decisions are the same:

- **Name and notes.** Write down where and why you place it in `notes`, for example `\\fs01\finance\2026\Q3 forecast.docx, link on page 2`. Notes help whoever cleans up decoys, and whoever triages an incident from it.
- **Redirect.** Whoever opens a `web_url` sees its target, usually from outside your network. Choose a public page that fits the placement. An internal address would reveal an internal host name. Without `redirect_url`, the trigger uses its default target.
- **Severity.** See below.
- **Techniques.** The MITRE ATT&CK techniques that a request suggests, for example `T1083` (File and Directory Discovery) for a link on a file share. Nyktus checks them against the ATT&CK version it ships and rejects a revoked or deprecated one.

This request creates a `web_url` for a link in a document:

```sh
curl --fail-with-body --request POST "<console-url>/api/v1/honeytokens" \
  --header "Authorization: Bearer $NYKTUS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
  "type": "web_url",
  "name": "Finance share: Q3 forecast link",
  "notes": "\\\\fs01\\finance\\2026\\Q3 forecast.docx, link on page 2",
  "redirect_url": "https://www.example.com/investors",
  "techniques": ["T1039", "T1083"]
}'
```

The response, with status `201`, holds the `trigger_url` of a `web_url` or `web_image`, or the `trigger_names` of a `dns` honeytoken. Place it exactly as it is.

A `dns` honeytoken needs the zones of the DNS role. Without `NYKTUS_DNS_ZONES` set for the console, the request fails with `422` and the code `dns_not_configured`.

### Severity

Every event takes the severity of its honeytoken, and an incident takes the highest severity of its events. Unless you choose one, or a deception of the catalog does, a honeytoken has the default of its type:

| Type | Default | Why |
|---|---|---|
| `web_url` | `medium` | Opening a URL is deliberate, but what it pretends to lead to is unknown. |
| `web_image` | `low` | Mail gateways, previews and scanners load images without anyone opening them. |
| `dns` | `medium` | Resolving a name is deliberate, as for a URL. |

Raise the severity of a honeytoken that nobody has a reason to touch, such as credentials in a file that only an intruder reads. Lower it where harmless access is likely. An event keeps the severity the honeytoken had when it was recorded, so a change applies to later events only.

## The URL

Every honeytoken has a trigger value of 128 random bits, 26 characters of lowercase letters and digits. The URL is the address of the trigger followed by that value, for example `https://t.example.net/q3xwz7a2kfm4ub6tyc5nre2lpa`. The URL of a `web_image` ends with `.gif`.

The value cannot be changed. If a URL has been exposed to people who should not have it, for example in a screenshot, create a new honeytoken, place its URL and delete the old one.

### The address of the trigger

`NYKTUS_TRIGGER_URL` is the public address of the trigger, and every URL starts with it. Whoever finds a honeytoken sees it, and so do the systems that loaded it.

- **Reachable from the internet.** Stolen documents are opened on the intruder's infrastructure, not in your network. The console stays internal. Nyktus refuses to start when both addresses name the same host.
- **Inconspicuous.** Use a host name that names neither Nyktus nor a decoy. The [stealth considerations](/security/stealth) explain why.
- **Stable.** The address is part of every placed URL. Changing it breaks the honeytokens you have placed.

### What the trigger answers

The trigger answers by the form of the request and never by what it knows. A `POST`, to any path, gets `200` without a body. Of the other requests, a URL that ends with `.gif` gets a transparent image of one pixel, and every other URL, `/` and `/robots.txt` included, gets a redirect: to the `redirect_url` of its honeytoken, or to the default target `NYKTUS_TRIGGER_DEFAULT_REDIRECT`. An unknown value, a disabled honeytoken and an active one look the same. No answer carries a header that names Nyktus, and every answer is sent with `Cache-Control: no-store`, so that a second request reaches the trigger as well.

The trigger reads URLs in lower case, so a URL that was written in upper case on its way, for example in a QR code, still counts.

Put a reverse proxy in front of the trigger. It answers malformed requests that would otherwise reach the HTTP server of Nyktus, and it can limit the rate of requests.

## Report with a POST

A log shipper on a server or the webhook of a cloud service cannot open a link, but it can send a request. It reports to a honeytoken with a `POST` to the URL of a `web_url`, and Nyktus records the request as an event together with the start of its body. After this section you can point such a sender at a honeytoken and know what it stores, what the sender sees and what it costs.

Create one `web_url` for each sender, for example one for each server or each cloud account, and name it after the sender. The incident then tells you which one reported, and a flood from one sender cannot use the [limit of events](#what-an-event-records) of another. Enter the URL in the sender exactly as the console shows it. No type of its own exists, and `redirect_url` has no effect on a `POST`.

This request reports an event of a log shipper. Replace the URL with that of your honeytoken:

```sh
curl --include --request POST "https://t.example.net/q3xwz7a2kfm4ub6tyc5nre2lpa" \
  --header "Content-Type: application/json" \
  --data '{"event_id":"4769","account":"svc-backup","address":"203.0.113.9"}'
```

The answer is always the same:

```
HTTP/1.1 200 OK
Cache-Control: no-store
Content-Length: 0
Date: Sun, 25 Oct 2026 11:51:45 GMT
```

Fluent Bit, for example, sends records with its [`http` output](https://docs.fluentbit.io/manual/data-pipeline/outputs/http), which uses `POST` unless you change `http_method`:

```yaml
outputs:
  - name: http
    match: '*'
    host: t.example.net
    port: 443
    uri: /q3xwz7a2kfm4ub6tyc5nre2lpa
    tls: on
    format: json
```

For the domain controllers of Active Directory, see [Forward the logs of domain controllers](/guides/log-forwarding).

### What the sender sees

Every `POST` to every path gets the same `200` without a body, whether the value is live, unknown, disabled or over its limit, and whether recording worked or failed. Senders repeat what they do not see succeed, and an answer that differed by value would show whoever finds the URL which values are live.

The cost is that a sender cannot tell that a report was lost. The log shows it: `trigger: request` has the `outcome` `failed` or `limited` for such a request, see [Logs](/operate/logs).

### What Nyktus stores

The first 4096 bytes of the body, as text. Nyktus does not parse the body, so JSON, form data and plain text are stored alike. Line breaks and tabs become spaces, other characters that cannot be printed are replaced, and the excerpt ends at a character. The rest of a longer body is not stored. The start of the body is read within two seconds; a body that arrives more slowly or breaks off is stored as far as it came.

The console shows the excerpt on the event, and the API returns it as `body_excerpt`. It is empty for `GET` and `HEAD`. It reaches no alert, mail or log record.

The body can hold personal data, such as account names and addresses, and everyone who can read events reads it, see [Personal data](/guides/incidents#personal-data). Leave out what Nyktus does not need in the sender, for example by a filter in the shipper, because Nyktus keeps the excerpt until the [retention](/guides/incidents#retention) of events ends.

### What it costs

Whoever knows the URL can send forged events, and can use the limit of 10 events per honeytoken and minute up, so that later reports of the real sender are not stored. The first event of an incident has already raised the alert. Keep the URL in the configuration of the sender, readable only by its service account, send it over HTTPS, and let the sender report only matches instead of its whole stream, so that benign records do not use the limit.

## What an event records

The trigger records an event for every `GET`, `HEAD` and `POST` request of an enabled honeytoken. Other methods get the same answer as a `GET` and are not recorded, and neither are requests of a disabled honeytoken. The DNS role records an event for every query of a name that holds the value of an enabled honeytoken.

An event of the trigger holds:

| Field | Content |
|---|---|
| Honeytoken | Its identifier and type, and the techniques, severity and scenario it had at that time. The event keeps them when you change or delete the honeytoken. |
| Time | When the trigger recorded the request. |
| Client address | The address of the client. Set `NYKTUS_TRUSTED_PROXIES` so that it is the client and not your reverse proxy. |
| Method | `GET`, `HEAD` or `POST`. |
| `User-Agent`, `Referer`, `Accept-Language` | The headers of the request, cut to 512, 1024 and 128 bytes, with unprintable characters replaced. The client chooses them, so treat them as claims. The `Referer` often shows where an image was embedded. |
| Body | For a `POST`, the first 4096 bytes of the body, as text that the client chose. See [Report with a POST](#report-with-a-post). |

Nothing else is recorded: no cookies, no other headers, and a body only for a `POST`. An event of the DNS role is described in [DNS honeytokens](/guides/dns-honeytokens#what-an-event-records).

Events contain personal data, such as client addresses. Give an integration that needs them the scope `events:read`, and keep it from the others.

At most 10 events per honeytoken and minute are recorded, over HTTP and DNS together, so that a flood of requests for one known URL cannot fill the database. The trigger counts the requests beyond the limit and logs their number once a minute as `trigger: requests not recorded` with the identifier of the honeytoken.

## Change and retire

- **Disable instead of delete** while you are unsure whether a URL is still placed somewhere. A disabled honeytoken records no events and answers as before.
- **Delete** when you have removed the URL from where you placed it. Its events remain. A request of the URL is then answered like any unknown URL and no longer recorded.
- **Scenario.** A new honeytoken stands alone. Add it to a scenario so that its events join the incident of that scenario.

To change or delete a honeytoken, see [`PATCH`](/api/reference/honeytokens#updateHoneytoken) and [`DELETE`](/api/reference/honeytokens#deleteHoneytoken). A member you leave out of a `PATCH` stays as it is, `"redirect_url": null` removes the redirect, and `"techniques": []` removes the techniques.

## Who can read honeytokens

Honeytokens and their notes are the most sensitive data of an installation: whoever reads them knows which URLs to avoid. Give integrations that do not manage honeytokens API keys without the scopes `honeytokens:read` and `honeytokens:write`, and grant the role `viewer` only to people who need to see the decoys. See [Authentication](/api/authentication#choosing-scopes).
