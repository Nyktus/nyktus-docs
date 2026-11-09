---
title: Quickstart
description: Run the released containers of Nyktus with Docker Compose, place a honeytoken and a honeypot, and see the incidents they raise.
---

# Quickstart

You start the released containers of Nyktus with Docker Compose on one machine, place a honeytoken and a honeypot, trigger both, and see the incidents they raise. At the end you remove everything again.

::: warning For trying out only
This page uses self-signed certificates and host names that only your machine knows, and it runs the sensor in development mode. Do not use these settings for an installation that holds real data. [Deploy](/operate/deploy) describes a real installation.
:::

## What you need

- Docker with Compose
- `git`, `openssl`, `curl` and `nc` (netcat)
- The ports 80, 443, 2323, 8081, 8088 and 8443 of your loopback address free. The file of the settings in step 2 names the variables that change them, except the 2323 of the sensor, which is an argument in step 8.

## 1. Get the reference installation

The directory `deploy/compose` of the source holds the Compose file. Take it from the tag of the release:

```sh
git clone --depth 1 --branch v%%NYKTUS_VERSION%% https://github.com/Nyktus/nyktus.git
cd nyktus/deploy/compose
```

## 2. Configure

Every setting comes from the file `.env`. Start from the example, and add the values for this machine and the secrets. The later value of a setting wins. Only you should be able to read the file, because it holds the encryption key and the passwords of the database:

```sh
umask 077
cp .env.example .env
cat >> .env <<EOF

NYKTUS_VERSION=%%NYKTUS_VERSION%%
NYKTUS_CONSOLE_URL=https://console.localhost
NYKTUS_CONSOLE_HOST=console.localhost
NYKTUS_TRIGGER_URL=https://trigger.localhost:8443
NYKTUS_TRIGGER_HOST=trigger.localhost
NYKTUS_TRIGGER_PROXY_BIND=127.0.0.1
NYKTUS_TRIGGER_PROXY_HTTP_PORT=8088
NYKTUS_TRIGGER_PROXY_HTTPS_PORT=8443
COMPOSE_PROFILES=trigger-proxy
NYKTUS_ENCRYPTION_KEYS=1:$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -hex 24)
NYKTUS_OWNER_DB_PASSWORD=$(openssl rand -hex 24)
NYKTUS_CONSOLE_DB_PASSWORD=$(openssl rand -hex 24)
NYKTUS_TRIGGER_DB_PASSWORD=$(openssl rand -hex 24)
NYKTUS_DNS_DB_PASSWORD=$(openssl rand -hex 24)
NYKTUS_WORKER_DB_PASSWORD=$(openssl rand -hex 24)
EOF
umask 022
```

The console and the trigger have host names of their own. Names under `localhost` need no entry in a name server, because browsers and `curl` send them to your own machine. `NYKTUS_TRIGGER_URL` is the public address of the trigger, and every honeytoken URL starts with it.

## 3. Create certificates

Outside development, Nyktus accepts only `https` addresses, so each of the two proxies needs a certificate. For this try-out, create self-signed ones. The key may be read by everyone here so that the user of the proxy reaches it; on a real installation it must not be, see [Deploy](/operate/deploy):

```sh
mkdir -p acme
for name in console trigger; do
  mkdir -p "certs/$name"
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -days 30 \
    -keyout "certs/$name/privkey.pem" -out "certs/$name/fullchain.pem" \
    -subj "/CN=$name.localhost" -addext "subjectAltName=DNS:$name.localhost"
  chmod 0644 "certs/$name/privkey.pem"
done
```

## 4. Start

```sh
docker compose up --detach
```

Compose pulls the images, starts PostgreSQL, applies the migrations and starts the console, the worker, the trigger and the two proxies. Check that the console answers. `curl` needs to trust the certificate, and the setting holds for the rest of this terminal:

```sh
export CURL_CA_BUNDLE="$PWD/certs/console/fullchain.pem"
curl https://console.localhost/livez
```

```json
{"status":"ok"}
```

## 5. Create the administrator

Because there is no administrator yet, the console prints a setup URL with a token into its log:

```sh
docker compose logs console | grep -o 'https://[^ "]*/setup#token=[^ "]*'
```

Open the URL in a browser, accept the warning about the self-signed certificate and fill in the form, or send the request from the terminal. Put the request into a file first, so that the password stays out of your shell history. Replace `<the token>` with the part of the URL after `#token=`:

```sh
umask 077
cat > setup.json <<'EOF'
{
  "token": "<the token>",
  "email": "admin@example.com",
  "display_name": "Ada Admin",
  "password": "correct-horse-battery-staple"
}
EOF
umask 022
curl --fail-with-body https://console.localhost/api/v1/setup \
  --header "Content-Type: application/json" --data @setup.json
rm setup.json
```

The answer holds the new account. The setup URL works once and expires after one hour.

## 6. Place a honeytoken and trigger it

Sign in, create a honeytoken, and note the `trigger_url` of the answer:

```sh
curl --fail-with-body https://console.localhost/api/v1/session \
  --header "Content-Type: application/json" \
  --data '{"email": "admin@example.com", "password": "correct-horse-battery-staple"}' \
  --cookie-jar cookies.txt

curl --fail-with-body https://console.localhost/api/v1/honeytokens \
  --header "Content-Type: application/json" \
  --data '{"type": "web_url", "name": "Quickstart link", "redirect_url": "https://www.example.com/"}' \
  --cookie cookies.txt
```

This is the answer to the second request, formatted for reading; the identifiers and the trigger value differ in your installation:

```json
{
  "id": "ef350849-c414-438d-8e30-c1363203c8d6",
  "type": "web_url",
  "name": "Quickstart link",
  "notes": "",
  "enabled": true,
  "redirect_url": "https://www.example.com/",
  "techniques": [],
  "severity": "medium",
  "trigger_value": "m452kjyaxntileujp7b2itm6g4",
  "trigger_url": "https://trigger.localhost:8443/m452kjyaxntileujp7b2itm6g4",
  "trigger_names": [],
  "scenario_id": null,
  "created_at": "2026-11-09T19:26:47.57396Z",
  "updated_at": "2026-11-09T19:26:47.57396Z"
}
```

Request the `trigger_url` as an intruder would. The trigger has a certificate of its own:

```sh
curl --include --cacert certs/trigger/fullchain.pem "<the trigger_url>"
```

```text
HTTP/2 302
server: nginx
content-length: 0
location: https://www.example.com/
cache-control: no-store
```

The answer is a redirect to the `redirect_url`, with no body and no header that names Nyktus. The trigger answers every URL this way, whether or not it belongs to a honeytoken, so that nobody learns which URLs are decoys.

## 7. See the incident

The worker needs a moment to correlate the event. Then list the open incidents:

```sh
curl --fail-with-body "https://console.localhost/api/v1/incidents?status=open" --cookie cookies.txt
```

The answer lists one incident named `Quickstart link`, with `"status": "open"`, the severity `medium` and `"event_count": 1`. Request the URL again and the new event joins the same incident: `event_count` becomes `2`. The web console shows the same under Incidents at `https://console.localhost`.

## 8. Place a honeypot

A honeypot is a network service that the sensor emulates. Create one for a Telnet login:

```sh
curl --fail-with-body https://console.localhost/api/v1/honeypots \
  --header "Content-Type: application/json" \
  --data '{"service": "telnet", "name": "Quickstart switch"}' \
  --cookie cookies.txt
```

The answer holds the `id` and the `secret`. Write the configuration of the sensor with these two values. The sensor joins the network of the Compose installation and reports straight to the trigger over `http`, which only `environment: development` allows:

```sh
mkdir sensor
umask 077
cat > sensor/sensor.yaml <<'EOF'
trigger_url: http://trigger:8081/
environment: development
honeypots:
- id: "<the id>"
  service: "telnet"
  listen: "0.0.0.0:2323"
  secret: "<the secret>"
EOF
umask 022
```

Start the sensor. It runs as your own user, because it refuses a configuration that others can read and the file holds the secret:

```sh
docker run --detach --rm --name nyktus-quickstart-sensor \
  --user "$(id -u):$(id -g)" --read-only --network nyktus_backend \
  --publish 127.0.0.1:2323:2323 --volume "$PWD/sensor:/etc/nyktus-sensor:ro" \
  ghcr.io/nyktus/nyktus-sensor:%%NYKTUS_SENSOR_VERSION%%
```

Within seconds, the honeypot has the status `online`. Connect to it as an intruder would, and enter any name and password:

```sh
nc 127.0.0.1 2323
```

```text
Ubuntu 22.04.4 LTS
login: admin
Password:
Login incorrect
login:
```

Press `Ctrl+C` to leave. The sensor reports the session when it ends, and a second open incident appears, named `Quickstart switch`, with the technique `T1110` (Brute Force). The event holds the name `admin` and the length of the password, never the password.

No alert went out, because no alert channel exists yet. [Alerting](/guides/alerting) sets up channels for mail, Slack, Teams and webhooks. A channel receives the alerts of incidents that open after it exists.

## Clean up

Stop the sensor and remove the containers, the database and the checkout:

```sh
docker stop nyktus-quickstart-sensor
docker compose down --volumes
cd ../../..
rm -rf nyktus
```

## Next

- [Concepts](/getting-started/concepts) and [Architecture](/getting-started/architecture) explain what you just ran, and why a real installation splits the roles.
- [Honeytokens](/guides/honeytokens) and [honeypots](/guides/honeypots) cover the types, the placement and what an event records.
- The [deception catalog](/guides/catalog) offers guides with example files for whole stories, and [scenarios](/guides/scenarios) group the decoys of one story.
- [Deploy](/operate/deploy) turns what you ran into an installation that holds real data.
