---
title: Quickstart
description: Build Nyktus, run it on one machine, place a honeytoken and see the incident it raises.
---

# Quickstart

You build Nyktus from source, run it on one machine, place a honeytoken, trigger it, and read the incident it raises. At the end you have seen the whole path from a touched decoy to an incident, on a database you throw away afterwards.

::: warning Before the first release
There are no packages or container images yet, so this page builds from source. It runs everything in development mode on your own machine, with passwords that are public on this page. Do not use these settings for an installation that holds real data. Operating Nyktus for real is the subject of the operations section.
:::

## What you need

- Go 1.26 or later, and Node.js 24, which builds the web console that the server binary embeds
- Docker, for a disposable PostgreSQL 16
- `make`, `openssl` and `curl`

## 1. Build

```sh
git clone https://github.com/Nyktus/nyktus.git
cd nyktus
make build
```

`make build` builds the web console, then writes `bin/nyktus` and `bin/nyktus-sensor`. You need only the first one here.

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

The answer is `201` with the new account. The setup URL works once and for one hour, and after this there is no setup URL any more.

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

The answer holds a `trigger_url`, such as `http://127.0.0.1:8081/jgtrtryc7c72adcf4ldpa4b3wm`. Request it as an intruder would:

```sh
curl --include "<the trigger_url>"
```

The answer is a `302` to `https://www.example.com/` with no body and no header that names Nyktus. The trigger answers every URL this way, whether or not it belongs to a honeytoken, so that nobody learns which URLs are decoys.

## 8. See the incident

The worker needs a moment to correlate the event. Then list the open incidents:

```sh
curl --fail-with-body "http://127.0.0.1:8080/api/v1/incidents?status=open" --cookie cookies.txt
```

The incident is named `Quickstart link` and has the severity `medium`, the default of a `web_url`. Request the URL again and the new event joins the same incident without another alert. The web console shows the same under Incidents: open `http://127.0.0.1:8080` in a browser and sign in with the account you created.

No alert went out, because no alert channel exists yet. An alert channel is what turns an incident into an email or a message in a chat.

## Clean up

Stop the server with `Ctrl+C` in the first terminal, and remove the database and the files:

```sh
make db-down
rm nyktus.env cookies.txt
```

## Next

- [Concepts](/getting-started/concepts) and [Architecture](/getting-started/architecture) explain what you just ran, and why a real installation splits the roles.
- [Honeytokens](/guides/honeytokens) covers the types, the placement and what an event records.
- [Alerting](/guides/alerting) sets up the channels that deliver an alert.
- The [deception catalog](/guides/catalog) creates a whole scenario with its files and a guide.
