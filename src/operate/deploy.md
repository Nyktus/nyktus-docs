---
title: Deploy
description: Build Nyktus, give each server role its own settings, and run the roles on separate hosts under systemd or Compose.
---

# Deploy

This page takes you from the source code to an installation that runs each server role on the host where it belongs. Afterwards your team reaches the console, the internet reaches the trigger, and the roles start again after a reboot. Read [Architecture](/getting-started/architecture) first if you have not decided which role runs where.

## What you need

- **Two hosts at least.** One internal host for the roles `console` and `worker`, and one host that the internet can reach for `trigger` and, for [DNS honeytokens](/guides/dns-honeytokens), `dns`. The internal host must lie outside the environment that Nyktus watches.
- **PostgreSQL 16 or later**, set up as [Database setup](/operate/database) describes, reachable from both hosts. Allow the connections of the internet-facing host for its own logins only, and over TLS.
- **Two host names** with certificates: one for the console and one for the trigger. They must differ, and the trigger name should name neither Nyktus nor a decoy, see [the address of the trigger](/guides/honeytokens#the-address-of-the-trigger).
- **A reverse proxy** on each of these hosts, see [Reverse proxy](/operate/reverse-proxy).
- **Go 1.26 and Node.js 24** on a build machine. The servers need neither.

## Build

Version 0.1 is distributed as source code. Build the release you want on any machine:

```sh
git clone https://github.com/Nyktus/nyktus.git
cd nyktus
git checkout v0.1.0
make build
```

`bin/nyktus` is one binary for all roles, with the web console embedded. `bin/nyktus-sensor` is the [sensor](/guides/sensor). Copy `bin/nyktus` to `/usr/local/bin/nyktus` on every server host.

## Give each role its own settings

A process reads only the settings of the roles it runs, and a process that runs several roles holds the database logins of all of them. Run each role as a process of its own, and give each one only its own settings. This is the minimum for each role. The values are examples; [Configuration](/operate/configuration) lists every setting.

`console.env`, for the internal host:

```sh
NYKTUS_CONSOLE_URL=https://nyktus.example.com
NYKTUS_TRIGGER_URL=https://t.example.net
NYKTUS_TRUSTED_PROXIES=127.0.0.1
NYKTUS_ENCRYPTION_KEYS=1:<32 random bytes in base64>
NYKTUS_CONSOLE_DATABASE_URL=postgres://nyktus_console_login:<console password>@db.internal.example.net/nyktus?sslmode=verify-full
```

`worker.env`, for the same host:

```sh
NYKTUS_CONSOLE_URL=https://nyktus.example.com
NYKTUS_ENCRYPTION_KEYS=1:<the same key as for the console>
NYKTUS_WORKER_DATABASE_URL=postgres://nyktus_worker_login:<worker password>@db.internal.example.net/nyktus?sslmode=verify-full
```

`trigger.env`, for the internet-facing host:

```sh
NYKTUS_TRIGGER_DEFAULT_REDIRECT=https://www.example.com/
NYKTUS_TRUSTED_PROXIES=127.0.0.1
NYKTUS_TRIGGER_DATABASE_URL=postgres://nyktus_trigger_login:<trigger password>@db.example.net/nyktus?sslmode=verify-full
```

`dns.env`, for the same host, if you use DNS honeytokens:

```sh
NYKTUS_DNS_ZONES=d.example.net
NYKTUS_DNS_NAMESERVERS=ns1.example.net
NYKTUS_DNS_ANSWER_IPV4=203.0.113.80
NYKTUS_DNS_DATABASE_URL=postgres://nyktus_dns_login:<dns password>@db.example.net/nyktus?sslmode=verify-full
```

The console needs the same `NYKTUS_DNS_ZONES` as the DNS role if you use DNS honeytokens, and the worker needs the SMTP settings if you use email channels. Nyktus listens on the loopback address by default, which suits a reverse proxy on the same host.

Each file holds passwords and the encryption key. Make it readable by its administrator only, and keep a copy of the encryption key somewhere else, because without it the encrypted secrets are lost, see [Encryption keys](/operate/configuration#encryption-keys). A variable also accepts a file instead, with the suffix `_FILE`, for secret stores that mount files.

Apply the migrations before the first start, as [Database setup](/operate/database#set-up) shows.

## Run with systemd

One unit template runs every role. The name after the `@` is the role, and the unit reads `/etc/nyktus/<role>.env`. Save it as `/etc/systemd/system/nyktus@.service`:

```ini
[Unit]
Description=Nyktus %i
After=network-online.target
Wants=network-online.target

[Service]
User=nyktus
EnvironmentFile=/etc/nyktus/%i.env
ExecStart=/usr/local/bin/nyktus serve --roles=%i
Restart=on-failure
RestartSec=5s

NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
RestrictNamespaces=yes
LockPersonality=yes
MemoryDenyWriteExecute=yes
SystemCallFilter=@system-service
SystemCallArchitectures=native

[Install]
WantedBy=multi-user.target
```

Create the user and the directory, install the files, and start the roles of the internal host. systemd reads the environment files as root, so the user of Nyktus does not have to read them:

```sh
sudo useradd --system --no-create-home --shell /usr/sbin/nologin nyktus
sudo install -d -m 0755 /etc/nyktus
sudo install -m 0600 console.env worker.env /etc/nyktus/
sudo systemctl enable --now nyktus@console nyktus@worker
```

On the internet-facing host, install `trigger.env` and `dns.env` the same way and start `nyktus@trigger` and `nyktus@dns`. The DNS role listens on `127.0.0.1:8053` by default. To let it listen on port 53 without a privilege of the user, give the role a drop-in with `sudo systemctl edit nyktus@dns`, and set `NYKTUS_DNS_ADDR=0.0.0.0:53` in `dns.env`:

```ini
[Service]
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
```

The logs go to the journal: `journalctl --unit nyktus@console`. The console prints the [setup URL](/operate/first-start) to standard output, so it is in the journal too. Treat it like a password until you have used it.

## Run with Compose

Version 0.1 ships no container image. Build one from the source with the Dockerfile of the development environment, on the build machine, and make it available to the hosts:

```sh
docker build --file deploy/dev/Dockerfile --tag nyktus:0.1 .
```

The file below runs the roles in read-only containers without capabilities. The profiles select the roles of a host: `internal` for the console and the worker, `edge` for the trigger and the DNS role. Run each profile on its own host, with its own environment files. The ports are published on the loopback address, for the reverse proxy on the host. Only the DNS role is published on the public port 53.

```yaml
name: nyktus

x-nyktus: &nyktus
  image: nyktus:0.1
  restart: unless-stopped
  read_only: true
  cap_drop: [ALL]
  security_opt: ["no-new-privileges:true"]

services:
  # Applies the migrations: docker compose --profile migrate run --rm migrate
  migrate:
    <<: *nyktus
    profiles: [migrate]
    restart: "no"
    command: [migrate]
    env_file: migrate.env

  # Internal host: docker compose --profile internal up --detach
  console:
    <<: *nyktus
    profiles: [internal]
    command: [serve, --roles=console]
    env_file: console.env
    ports:
      - 127.0.0.1:8080:8080

  worker:
    <<: *nyktus
    profiles: [internal]
    command: [serve, --roles=worker]
    env_file: worker.env

  # Host that the internet can reach: docker compose --profile edge up --detach
  trigger:
    <<: *nyktus
    profiles: [edge]
    command: [serve, --roles=trigger]
    env_file: trigger.env
    ports:
      - 127.0.0.1:8081:8081

  dns:
    <<: *nyktus
    profiles: [edge]
    command: [serve, --roles=dns]
    env_file: dns.env
    ports:
      - 53:8053/udp
      - 53:8053/tcp
```

- **Environment files.** `console.env`, `worker.env`, `trigger.env` and `dns.env` are the files from above. `migrate.env` holds `NYKTUS_DATABASE_URL`, the URL of the owner, which only the migration uses.
- **Quote a list of roles.** Each service here runs one role. If you run several roles in one process, write `"--roles=console,worker"` in quotes: in a YAML list, an unquoted `--roles=console,worker` is split at the comma, and the server stops with `unexpected arguments`.
- **Listen on all addresses in the container.** Add `NYKTUS_CONSOLE_ADDR=0.0.0.0:8080` to `console.env`, `NYKTUS_TRIGGER_ADDR=0.0.0.0:8081` to `trigger.env` and `NYKTUS_DNS_ADDR=0.0.0.0:8053` to `dns.env`. The ports are still reachable from the host only, because the file publishes them on the loopback address. Put the address of the Docker network, such as `172.16.0.0/12`, into `NYKTUS_TRUSTED_PROXIES`, because the reverse proxy reaches the container from there.
- **`env_file` keeps the secrets in the container's environment.** Anyone who may run `docker inspect` can read them. Keep the files readable by their administrator only, and restrict access to the Docker daemon.

## Check the installation

1. The console answers on the loopback address of its host: `curl --include http://127.0.0.1:8080/readyz` returns `200`. See [Health](/api/reference/health).
2. Any URL on the trigger host answers with a redirect to your default target, and no header names Nyktus: `curl --include https://t.example.net/check`.
3. Open the console under its address and create the first administrator, as [First start](/operate/first-start) describes.
4. If you use DNS honeytokens, test the delegation as [DNS honeytokens](/guides/dns-honeytokens#check-that-it-works) describes.
5. Create an [alert channel](/guides/alerting) and send a test message.
6. Set up the monitoring of [Metrics](/operate/metrics#suggested-alerts), so that you notice a stopped worker.
7. Go through the [hardening checklist](/operate/hardening).
