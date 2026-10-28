---
title: Forward the logs of domain controllers
description: Send the Windows events that requests for decoy accounts raise on a domain controller to a honeytoken, so that they open an incident.
---

# Forward the logs of domain controllers

A decoy account in Active Directory raises no request that Nyktus can see. Whoever asks a domain controller for a ticket for it, or tries to sign in as it, leaves a record in the Security log of that controller. After this page, a log forwarder on each domain controller reports those records to Nyktus, and the first one opens an incident.

The page uses [Fluent Bit](https://docs.fluentbit.io) and the story [Decoy accounts in the directory](/guides/catalog-reference#ad-decoy-accounts) of the [deception catalog](/guides/catalog), whose guide names the account, the event and the test for each decoy. It assumes that you applied the story to a scenario and that you administer the domain controllers.

## How the report reaches Nyktus

The forwarder reads the Security log, keeps the events about your decoy accounts and sends them with a `POST` to the URL of a `web_url` honeytoken. Nobody opens that URL; it is only the address of the report. Nyktus records the request like any other `POST`, see [Report with a POST](/guides/post-reports).

## Give every domain controller a honeytoken

A Security log belongs to one controller, so a request appears only in the log of the controller that served it. Every controller needs a forwarder, and every forwarder needs a honeytoken of its own: the alert names the honeytoken and never the body of the event, so it tells you which controller reported only if each has its own.

Applying the story created one honeytoken, `Ingest`. Rename it after the first controller, then create one for each further controller and add it to the scenario. Use the severity and the techniques of the first honeytoken, which you read with [`GET /api/v1/honeytokens/<id>`](/api/reference/honeytokens#getHoneytoken):

```sh
curl --fail-with-body --request PATCH "<console-url>/api/v1/honeytokens/<ingest-id>" \
  --header "Authorization: Bearer $NYKTUS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"name": "dc01"}'

curl --fail-with-body --request POST "<console-url>/api/v1/honeytokens" \
  --header "Authorization: Bearer $NYKTUS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
  "type": "web_url",
  "name": "dc02",
  "severity": "critical",
  "techniques": ["T1558.003", "T1558.004", "T1110.001", "T1110.003", "T1110.004"]
}'

curl --fail-with-body --request PUT "<console-url>/api/v1/honeytokens/<dc02-id>/scenario" \
  --header "Authorization: Bearer $NYKTUS_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"scenario_id": "<scenario-id>"}'
```

The second response holds the `trigger_url` of `dc02`. Enter the URL of a controller only in the configuration of that controller. For the rules of the assignment, see [Add decoys](/guides/scenarios#add-decoys).

## Turn on the audit policy

A domain controller writes the events only if its audit policy asks for them. In the group policy of the domain controllers, set the category Account Logon to audit success and failure for these subcategories:

| Subcategory | Events |
|---|---|
| Audit Kerberos Service Ticket Operations | 4769, a service ticket was requested |
| Audit Kerberos Authentication Service | 4768, a ticket granting ticket was requested; 4771, pre-authentication failed |
| Audit Credential Validation | 4776, the domain controller checked credentials with NTLM |

`auditpol /list /subcategory:*` lists the names of the subcategories. Audit Kerberos Service Ticket Operations produces a high volume of events on a domain controller, so the forwarder in the next step must filter.

The events 4624 and 4625 are not suitable. They arise on the computer where a sign-in is attempted, so a domain controller records them only for a sign-in at itself.

## Configure Fluent Bit

Install Fluent Bit on each domain controller as its documentation describes. Then write the configuration. Replace the account names with those of your decoys, and `host`, `port` and `uri` with the parts of the `trigger_url` of this controller: for `https://t.example.net/q3xwz7a2kfm4ub6tyc5nre2lpa`, the host is `t.example.net`, the port `443` and the uri `/q3xwz7a2kfm4ub6tyc5nre2lpa`.

```yaml
service:
  log_level: info

pipeline:
  inputs:
    - name: winevtlog
      tag: winevtlog
      channels: Security
      interval_sec: 1
      db: C:\fluent-bit\winevtlog.sqlite
      read_existing_events: false
      event_data_as_map: true
      event_template_cache_size: 256
      event_query: >
        *[System[(EventID=4768 or EventID=4769 or EventID=4771 or EventID=4776)]]

  filters:
    - name: nest
      match: winevtlog
      operation: lift
      nested_under: EventData

    - name: grep
      match: winevtlog
      logical_op: or
      regex:
        - ServiceName ^svc-reporting$
        - TargetUserName ^(svc-legacy-scan|adm-backup)$

    - name: record_modifier
      match: winevtlog
      remove_key: SubjectUserSid
    - name: record_modifier
      match: winevtlog
      remove_key: TargetSid
    - name: record_modifier
      match: winevtlog
      remove_key: ServiceSid

    - name: throttle
      match: winevtlog
      rate: 1
      window: 6
      interval: 10s

  outputs:
    - name: http
      match: winevtlog
      host: t.example.net
      port: 443
      uri: /q3xwz7a2kfm4ub6tyc5nre2lpa
      tls: on
      tls.verify: on
      format: json
      json_date_key: occurred_at
      json_date_format: iso8601
```

| Section | What it does |
|---|---|
| `winevtlog` | Reads the channel `Security`. `db` remembers what was read, so that a restart does not send old events again. `read_existing_events: false` skips the log that exists at the first start. `event_query` selects the four events, and `event_data_as_map` delivers their data as named fields. |
| `nest` | Moves the fields of `EventData` to the top level of the record, where the filters after it can reach them. |
| `grep` | Keeps an event if it names one of the decoys: `ServiceName` for the ticket of the service account, `TargetUserName` for the other two. |
| `record_modifier` | Removes the security identifiers, which a report does not need. Add the fields you want to keep out of the event: `IpAddress`, which names the address of the intruder, is also personal data. |
| `throttle` | Lets through one event every 10 seconds on average over six intervals, and drops the rest without a trace. |
| `http` | Sends the records as JSON with a `POST`. `tls: on` is required, because the value that authenticates the report stands in the path. |

## Check what the forwarder sends

The filters name fields of the event, and a wrong name drops every event without an error. Before you rely on them, replace the `http` output for a moment with `stdout`:

```yaml
  outputs:
    - name: stdout
      match: winevtlog
```

Start Fluent Bit in a console with `fluent-bit.exe -c <configuration-file>`, run the test of a decoy from the guide of the story, and read the record that the forwarder prints. `ServiceName` or `TargetUserName` must stand at the top level with the name of the decoy. If a field is nested or named differently, change the keys of `grep` and `record_modifier`, then put the `http` output back.

## Test the report

Run the test of a decoy from the guide of the story. Within a minute, the scenario shows an incident, and the event shows the start of the body. Close the incident after the test.

If nothing arrives:

| Symptom | Cause | What to do |
|---|---|---|
| The record never leaves the forwarder. | The audit policy is off on this controller, or a filter drops the event. | Check the policy with the table above, then the output of `stdout`. |
| The forwarder sends, but no event appears. | Nyktus answers every `POST` with `200`, also for a value it does not know. The URL may be wrong, or the honeytoken disabled or over its limit. | Look for `trigger: request` in the [log](/operate/logs) of the trigger: `unknown`, `disabled` or `limited` is the `outcome`. |
| The first event arrives, the next ones do not. | The honeytoken stores 10 events a minute, or `throttle` drops them. | The first event has opened the incident already; later events add detail only. |
| The forwarder reports a certificate error. | The trigger presents a certificate that the controller does not trust. | Fix the certificate. Do not set `tls.verify: off`. |

## What Nyktus stores

The first 4096 bytes of each report, as text, never parsed and never part of an alert. The report can hold account names and addresses of computers, and everyone who can read events reads them, see [Personal data](/guides/incidents#personal-data). Keep out of the report what you do not need, and set the [retention of events](/guides/incidents#retention) to your data protection rules.

## Limits

- **The URL is a secret on each controller.** Whoever reads the configuration can send forged events and use up the limit of events, although the first event has already opened the incident. Allow only the service account of the forwarder to read the file, and always use HTTPS.
- **An intruder with administrator rights on a controller can stop the forwarder or change its configuration.** The report protects the decoys, not the controller.
- **A controller without a forwarder, or without the audit policy, reports nothing** for the requests it serves, and an intruder can choose the controller.
- **A controller that cannot reach the trigger over HTTPS cannot report.** Nothing queues the reports for a network without that route.
