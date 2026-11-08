---
title: Quickstart
description: Build Nyktus, run it on one machine, place a honeytoken and a honeypot, and see the incidents and the alert they raise.
---

# Quickstart

You build Nyktus from source, run it on one machine, place a honeytoken and a honeypot, trigger both, and receive the alert. At the end you have seen the whole path from a touched decoy to an incident and a message, on a database you throw away afterwards.

::: warning For trying out only
Version 0.1 is distributed as source code, so this page builds from source. It runs everything in development mode on your own machine, with passwords that are public on this page. Do not use these settings for an installation that holds real data. [Deploy](/operate/deploy) describes a real installation.
:::

## What you need

- Go 1.26 or later, and Node.js 24, which builds the web console that the server binary embeds
- Docker, for a disposable PostgreSQL 16
- `make`, `openssl`, `curl` and `nc` (netcat)

## 1. Build

```sh
git clone https://github.com/Nyktus/nyktus.git
cd nyktus
make build
```

`make build` builds the web console, then writes `bin/nyktus` and `bin/nyktus-sensor`. The sensor joins in step 9. To build a release instead of the current development state, check out its tag first, for example `git checkout v0.2.0`.

## 2. Start PostgreSQL

```sh
make db-up
```

This starts a PostgreSQL 16 container named `nyktus-test-db` on port 55432. It keeps nothing: the data is gone when the container stops (`make db-down`).

## 3. Create the roles and the database

Nyktus does not connect to its database as one user. Each server role gets its own login that can do only what the role needs, and migrations run as a separate owner. First create the group roles, then the owner, the database and the logins:

```sh
docker exec -i nyktus-test-db psql --username postgres --set ON_ERROR_STOP=1 < deploy/postgres/roles.sql

docker exec -i nyktus-test-db psql --username postgres --set ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE nyktus_owner LOGIN PASSWORD 'owner-pass';
CREATE DATABASE nyktus OWNER nyktus_owner ENCODING 'UTF8';
CREATE ROLE nyktus_console_login LOGIN PASSWORD 'console-pass' IN ROLE nyktus_console;
CREATE ROLE nyktus_trigger_login LOGIN PASSWORD 'trigger-pass' IN ROLE nyktus_trigger;
CREATE ROLE nyktus_worker_login LOGIN PASSWORD 'worker-pass' IN ROLE nyktus_worker;
SQL
```

There is no DNS login because this page does not use DNS honeytokens, which need a delegated zone.

## 4. Configure

Nyktus reads its settings from environment variables. Put them in a file that only you can read, because it holds the encryption key:

```sh
umask 077
cat > nyktus.env <<'EOF'
export NYKTUS_ENV=development
export NYKTUS_ENCRYPTION_KEYS="1:$(openssl rand -base64 32)"
export NYKTUS_TRIGGER_URL=http://127.0.0.1:8081
export NYKTUS_TRIGGER_DEFAULT_REDIRECT=https://www.example.com/
export NYKTUS_CONSOLE_DATABASE_URL='postgres://nyktus_console_login:console-pass@127.0.0.1:55432/nyktus?sslmode=disable'
export NYKTUS_TRIGGER_DATABASE_URL='postgres://nyktus_trigger_login:trigger-pass@127.0.0.1:55432/nyktus?sslmode=disable'
export NYKTUS_WORKER_DATABASE_URL='postgres://nyktus_worker_login:worker-pass@127.0.0.1:55432/nyktus?sslmode=disable'
EOF
. ./nyktus.env
```

Two of these settings matter beyond this page:

- `NYKTUS_ENCRYPTION_KEYS` encrypts the secrets that Nyktus must read back, such as the URLs of alert channels. Nyktus neither derives nor generates a key at startup, so a lost key means lost secrets.
- `NYKTUS_TRIGGER_URL` is the public address of the trigger, and every honeytoken URL starts with it. `NYKTUS_TRIGGER_DEFAULT_REDIRECT` is where the trigger sends everything that is not a honeytoken with its own target.

The console listens on `127.0.0.1:8080` and the trigger on `127.0.0.1:8081`. If a port is taken, set `NYKTUS_CONSOLE_ADDR` or `NYKTUS_TRIGGER_ADDR` and, for the trigger, the matching `NYKTUS_TRIGGER_URL`.

## 5. Migrate and start

```sh
NYKTUS_DATABASE_URL='postgres://nyktus_owner:owner-pass@127.0.0.1:55432/nyktus?sslmode=disable' bin/nyktus migrate
bin/nyktus serve --roles=console,worker,trigger
```

One process now runs three roles: the console with the API and the web console, the worker that turns events into incidents and alerts, and the trigger that answers honeytoken URLs. Because there is no administrator yet, the console prints a setup URL:

```
Nyktus has no administrator yet. Create the first one with the setup token in the
following URL, as described in "First start" in the operations documentation.
The token is valid until 2026-10-24T20:49:34Z. Restart Nyktus to get a new one.

    http://127.0.0.1:8080/setup#token=<the token>
```

Leave this terminal running and open a second one for the rest.

## 6. Create the administrator

Open the setup URL in a browser and fill in the form, or send the request from a terminal. Put the request into a file first, so that the password stays out of your shell history. Replace `<the token>` with the part of the URL after `#token=`:

```sh
cd nyktus
umask 077
cat > setup.json <<'EOF'
{
  "token": "<the token>",
  "email": "admin@example.com",
  "display_name": "Ada Admin",
  "password": "correct-horse-battery-staple"
}
EOF
curl --fail-with-body http://127.0.0.1:8080/api/v1/setup \
  --header "Content-Type: application/json" --data @setup.json
rm setup.json
```

The answer is `201` with the new account. The setup URL works once and expires after one hour. Once an administrator exists, the console prints no more setup URLs.

## 7. Place a honeytoken and trigger it

Sign in, create a honeytoken, and request its URL:

```sh
curl --fail-with-body http://127.0.0.1:8080/api/v1/session \
  --header "Content-Type: application/json" \
  --data '{"email": "admin@example.com", "password": "correct-horse-battery-staple"}' \
  --cookie-jar cookies.txt

curl --fail-with-body http://127.0.0.1:8080/api/v1/honeytokens \
  --header "Content-Type: application/json" \
  --data '{"type": "web_url", "name": "Quickstart link", "redirect_url": "https://www.example.com/"}' \
  --cookie cookies.txt
```

The answer has the status `201` and holds the `trigger_url`. This is the answer, formatted for reading; the identifiers and the trigger value differ in your installation:

```json
{
  "id": "e9e3f60f-638e-4b70-a0a4-e6a03f7a36a1",
  "type": "web_url",
  "name": "Quickstart link",
  "notes": "",
  "enabled": true,
  "redirect_url": "https://www.example.com/",
  "techniques": [],
  "severity": "medium",
  "trigger_value": "f7qdqsqm55rbdmnunvudyvikha",
  "trigger_url": "http://127.0.0.1:8081/f7qdqsqm55rbdmnunvudyvikha",
  "trigger_names": [],
  "scenario_id": null,
  "created_at": "2026-10-28T21:59:19.234234+01:00",
  "updated_at": "2026-10-28T21:59:19.234234+01:00"
}
```

Request the `trigger_url` as an intruder would:

```sh
curl --include "<the trigger_url>"
```

```
HTTP/1.1 302 Found
Cache-Control: no-store
Content-Length: 0
Location: https://www.example.com/
Date: Wed, 28 Oct 2026 20:59:26 GMT
```

The answer is a `302` to the `redirect_url` with no body and no header that names Nyktus. The trigger answers every URL this way, whether or not it belongs to a honeytoken, so that nobody learns which URLs are decoys.

## 8. See the incident

The worker needs a moment to correlate the event. Then list the open incidents:

```sh
curl --fail-with-body "http://127.0.0.1:8080/api/v1/incidents?status=open" --cookie cookies.txt
```

The answer lists one incident, formatted here for reading:

```json
{
  "incidents": [
    {
      "id": "8a66da2b-54cd-4fc2-b19c-0294fc4b61b1",
      "resource_type": "honeytoken",
      "resource_id": "e9e3f60f-638e-4b70-a0a4-e6a03f7a36a1",
      "resource_name": "Quickstart link",
      "status": "open",
      "severity": "medium",
      "event_severity": "medium",
      "severity_override": null,
      "techniques": [],
      "event_techniques": [],
      "techniques_override": null,
      "notes": "",
      "event_count": 1,
      "first_event_at": "2026-10-28T20:59:26.081018Z",
      "last_event_at": "2026-10-28T20:59:26.081018Z",
      "opened_at": "2026-10-28T20:59:26.839869Z",
      "acknowledged_at": null,
      "closed_at": null
    }
  ]
}
```

The incident is named `Quickstart link` and has the severity `medium`, the default of a `web_url`. Request the URL again and the new event joins the same incident without another alert: `event_count` becomes `2`. The web console shows the same under Incidents: open `http://127.0.0.1:8080` in a browser and sign in with the account you created.

No alert went out, because no alert channel exists yet. An alert channel is what turns an incident into an email or a message in a chat.

## 9. Place a honeypot

A honeypot is a network service that the sensor emulates. Create one for a Telnet login:

```sh
curl --fail-with-body http://127.0.0.1:8080/api/v1/honeypots \
  --header "Content-Type: application/json" \
  --data '{"service": "telnet", "name": "Quickstart switch"}' \
  --cookie cookies.txt
```

The answer holds the `id`, the `secret` and the `sensor_config`, the entry for the configuration file of the sensor. Nyktus can show the secret again later to those who may change honeypots, see [Read the secret again](/guides/honeypots#read-the-secret-again). Write the configuration file with the `id` and the `secret` of the answer. The file listens on port 2323 of your machine, because port 23 needs a privilege, and reports to the trigger over `http`, which only the development mode allows:

```sh
umask 077
cat > sensor.yaml <<'EOF'
trigger_url: http://127.0.0.1:8081/
environment: development
honeypots:
- id: "<the id>"
  service: "telnet"
  listen: "127.0.0.1:2323"
  secret: "<the secret>"
EOF
bin/nyktus-sensor check -config sensor.yaml
```

The check prints `configuration ok: 1 honeypots`. Start the sensor in a third terminal and leave it running:

```sh
bin/nyktus-sensor run -config sensor.yaml
```

Within seconds, the honeypot has the status `online`. Connect to it as an intruder would, and enter any name and password:

```sh
nc 127.0.0.1 2323
```

```
Ubuntu 22.04.4 LTS
login: admin
Password:
Login incorrect
login:
```

Press `Ctrl+C` to leave. The sensor reports the session when it ends, and a second incident appears, named `Quickstart switch`, with the technique `T1110` (Brute Force). The event holds the name `admin` and the length of the password, never the password.

## 10. Receive the alert

An alert channel delivers the alert of each new incident. This step uses an email channel, which needs no account at a chat service. It needs an SMTP server. For a try-out, run a local mail catcher that accepts mail on port 2525 without encryption. Then stop the server in the first terminal with `Ctrl+C`, add the settings of the mail server to `nyktus.env`, read the file again and start the server again:

```sh
cat >> nyktus.env <<'EOF'
export NYKTUS_SMTP_HOST=127.0.0.1
export NYKTUS_SMTP_PORT=2525
export NYKTUS_SMTP_TLS=none
export NYKTUS_SMTP_FROM=nyktus@example.com
EOF
. ./nyktus.env
bin/nyktus serve --roles=console,worker,trigger
```

`NYKTUS_SMTP_TLS=none` sends mail in plain text and is allowed in development only. With a real mail server, leave it out and set the host and the port, see [Mail](/operate/configuration#mail).

In the second terminal, create the channel. Nyktus asks for your password, because an alert channel decides where alerts go. Put the request into a file first:

```sh
umask 077
cat > channel.json <<'EOF'
{
  "name": "SOC mailbox",
  "type": "email",
  "recipients": ["soc@example.com"],
  "password": "correct-horse-battery-staple"
}
EOF
curl --fail-with-body --json @channel.json --cookie cookies.txt http://127.0.0.1:8080/api/v1/alert-channels
rm channel.json
```

A channel receives the alerts of incidents that open after it exists. The incident `Quickstart link` is still open, so a new request would join it silently. Close it with the `id` from step 8, and request the URL again:

```sh
curl --fail-with-body --request PATCH "http://127.0.0.1:8080/api/v1/incidents/<the incident id>" \
  --header "Content-Type: application/json" \
  --data '{"status": "closed"}' \
  --cookie cookies.txt

curl --include "<the trigger_url>"
```

A closed incident never opens again, so the request opens a new incident with a new alert. A few seconds later, the mail catcher has received one message, and the incident lists its delivery with the status `delivered`. Replace the identifier with that of the new incident, which `GET /api/v1/incidents?status=open` lists:

```sh
curl --fail-with-body "http://127.0.0.1:8080/api/v1/incidents/<the new incident id>/deliveries" --cookie cookies.txt
```

```json
{
  "deliveries": [
    {
      "id": "389b980e-5292-40e2-bdb9-61bf4a29b608",
      "incident_id": "c04d3d82-6f5c-4502-8fff-d3464555626e",
      "channel_id": "87e1e969-3ba0-4716-93d5-ca9bfc25500d",
      "channel_type": "email",
      "channel_name": "SOC mailbox",
      "status": "delivered",
      "attempts": 1,
      "next_attempt_at": null,
      "last_attempt_at": "2026-10-28T22:25:53.608006+01:00",
      "last_status_code": null,
      "last_error": null,
      "last_duration_ms": 3,
      "delivered_at": "2026-10-28T22:25:53.61308+01:00",
      "created_at": "2026-10-28T22:25:52.605854+01:00"
    }
  ]
}
```

If the status is `dead`, `last_error` names the class of the failure. `not_configured` means that the worker has no SMTP server: check that `NYKTUS_SMTP_HOST` is set where the worker runs. See [Alerting](/guides/alerting#delivery) for the other classes.

## Clean up

Stop the server and the sensor with `Ctrl+C` in their terminals, stop the mail catcher, and remove the database and the files:

```sh
make db-down
rm nyktus.env cookies.txt sensor.yaml
```

## Next

- [Concepts](/getting-started/concepts) and [Architecture](/getting-started/architecture) explain what you just ran, and why a real installation splits the roles.
- [Honeytokens](/guides/honeytokens) and [honeypots](/guides/honeypots) cover the types, the placement and what an event records.
- [Alerting](/guides/alerting) sets up Slack, Teams, webhook and mail channels.
- The [deception catalog](/guides/catalog) offers guides with example files for whole stories, and [scenarios](/guides/scenarios) group the decoys of one story.
- [Deploy](/operate/deploy) turns what you ran into an installation that holds real data.
