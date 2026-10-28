---
title: Report with a POST
description: Point a log shipper or the webhook of a service at a honeytoken, and know what Nyktus stores, what the sender sees and what it costs.
---

# Report with a POST

A log shipper on a server or the webhook of a cloud service cannot open a link, but it can send a request. It reports to a honeytoken with a `POST` to the URL of a `web_url`, and Nyktus records the request as an event together with the start of its body. After this page you can point such a sender at a honeytoken and know what it stores, what the sender sees and what it costs.

Create one `web_url` for each sender, for example one for each server or each cloud account, and name it after the sender. The incident then tells you which one reported, and a flood from one sender cannot use the [limit of events](/guides/honeytokens#what-an-event-records) of another. Enter the URL in the sender exactly as the console shows it. No type of its own exists, and `redirect_url` has no effect on a `POST`.

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

## What the sender sees

Every `POST` to every path gets the same `200` without a body, whether the value is live, unknown, disabled or over its limit, and whether recording worked or failed. A sender repeats a request that does not succeed, and an answer that differed by value would show whoever finds the URL which values are live.

The cost is that a sender cannot tell that a report was lost. The log shows it: `trigger: request` has the `outcome` `failed` or `limited` for such a request, see [Logs](/operate/logs).

## What Nyktus stores

The first 4096 bytes of the body, as text. Nyktus does not parse the body, so JSON, form data and plain text are stored alike. Line breaks and tabs become spaces, other characters that cannot be printed are replaced, and the excerpt ends at a character. The rest of a longer body is not stored. The start of the body is read within two seconds; a body that arrives more slowly or breaks off is stored as far as it came.

The console shows the excerpt on the event, and the API returns it as `body_excerpt`. It is empty for `GET` and `HEAD`. It reaches no alert, mail or log record.

The body can hold personal data, such as account names and addresses, and everyone who can read events reads it, see [Personal data](/guides/incidents#personal-data). Filter out in the sender, for example in the shipper, what Nyktus does not need, because Nyktus keeps the excerpt until the [retention](/guides/incidents#retention) of events ends.

## What it costs

Whoever knows the URL can send forged events, and can use the limit of 10 events per honeytoken and minute up, so that later reports of the real sender are not stored. The first event of an incident has already raised the alert. Keep the URL in the configuration of the sender, readable only by its service account, send it over HTTPS, and let the sender report only matches instead of its whole stream, so that benign records do not use the limit.
