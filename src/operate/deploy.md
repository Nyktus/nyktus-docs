---
title: Deploy
description: Get and verify a release of Nyktus, give each server role its own settings, and run the roles on separate hosts under systemd or Compose.
---

# Deploy

This page takes you from a release to an installation that runs each server role on the host where it belongs. Afterwards your team reaches the console, the internet reaches the trigger, and the roles start again after a reboot. Read [Architecture](/getting-started/architecture) first if you have not decided which role runs where.

## What you need

- **Two hosts at least.** One internal host for the roles `console` and `worker`, and one host that the internet can reach for `trigger` and, for [DNS honeytokens](/guides/dns-honeytokens), `dns`. The internal host must lie outside the environment that Nyktus watches.
- **PostgreSQL 16 or later**, set up as [Database setup](/operate/database) describes, reachable from both hosts. Allow the connections of the internet-facing host for its own logins only, and over TLS.
- **Two host names** with certificates: one for the console and one for the trigger. They must differ, and the trigger name should name neither Nyktus nor a decoy, see [the address of the trigger](/guides/honeytokens#the-address-of-the-trigger).
- **A reverse proxy** on each of these hosts, see [Reverse proxy](/operate/reverse-proxy).

## Get the release

Each release publishes an archive per platform and a signed image. The archives hold `nyktus` (one binary for all roles, with the web console embedded), the licence and a notice. The sensor is released apart, see [the sensor](/guides/sensor#install).

Download the archive for your platform, the checksums and their signature. Version `0.1.0` for Linux on x86-64:

```sh
base=https://github.com/Nyktus/nyktus/releases/download/v0.1.0
curl -fLO "$base/nyktus_0.1.0_linux_amd64.tar.gz"
curl -fLO "$base/checksums.txt"
curl -fLO "$base/checksums.txt.sigstore.json"
```

The release workflow signs `checksums.txt` with [cosign](https://docs.sigstore.dev/cosign/) and no key of its own: the certificate in the signature names the workflow and the tag that produced the file, and the signature is recorded in a public log. Check both before you run anything:

```sh
cosign verify-blob checksums.txt --bundle checksums.txt.sigstore.json \
  --certificate-identity-regexp '^https://github.com/Nyktus/nyktus/\.github/workflows/release\.yml@refs/tags/v' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
sha256sum --check --ignore-missing checksums.txt
```

The first command prints `Verified OK`, the second `nyktus_0.1.0_linux_amd64.tar.gz: OK`. If either fails, do not use the file. Then unpack the archive and copy `nyktus` to `/usr/local/bin/nyktus` on every server host:

```sh
tar -xzf nyktus_0.1.0_linux_amd64.tar.gz nyktus
./nyktus version
```

```text
v0.1.0
```

Archives exist for Linux on x86-64 and arm64 and for macOS on arm64. Each has an SBOM (`*.sbom.spdx.json`) that lists the Go modules in the binary.

To build from the source instead, you need Go 1.26 and Node.js 24 on a build machine. Check out the tag and run `make build`, which writes `bin/nyktus` and `bin/nyktus-sensor`.

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

The images are `ghcr.io/nyktus/nyktus` for the server and `ghcr.io/nyktus/nyktus-sensor` for the sensor, for Linux on x86-64 and arm64. They hold the binary of the archive and nothing else: no shell, no package manager, and a user without root. Check the signature of an image like that of the archive; the identity is the same:

```sh
cosign verify ghcr.io/nyktus/nyktus:0.1.0 \
  --certificate-identity-regexp '^https://github.com/Nyktus/nyktus/\.github/workflows/release\.yml@refs/tags/v' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

The directory `deploy/compose` of the source holds a reference installation for one host: PostgreSQL, the migrations, every role, and an nginx container that serves the console over HTTPS. It is the starting point for an installation with real data, which `deploy/dev` is not. Its README is the guide:

- Every setting comes from `.env`. The file lists them, with a command for each secret, and Compose refuses to start while a required one is empty.
- The roles run in read-only containers without capabilities, as a user without root, and each connects to the database with its own login. The worker is a container of its own.
- The console is reachable through the proxy only, on the address of `NYKTUS_CONSOLE_BIND`: use an internal address, because the console does not belong on the internet.
- The trigger publishes its port on the loopback address for a proxy of your own. The profile `trigger-proxy` adds an nginx for it that logs no request and answers like the trigger where it answers itself. The profile `dns` adds the DNS role on port 53.
- The certificates are files you provide. The reference starts no certificate client.
- An upgrade changes `NYKTUS_VERSION`, then `docker compose pull` and `docker compose up --detach`; the migrations run first.

Compose reads all services, also those of a profile you do not use, so leave the example values of the DNS and trigger-proxy settings in `.env` if you do not use them.

To run the roles on separate hosts, as this page describes, use the same images with the commands and settings of the sections above: `serve --roles=trigger` and the settings of `trigger.env`, in a container that publishes the port on the loopback address.

## Check the installation

1. The console answers on the loopback address of its host: `curl --include http://127.0.0.1:8080/readyz` returns `200`. See [Health](/api/reference/health).
2. Any URL on the trigger host answers with a redirect to your default target, and no header names Nyktus: `curl --include https://t.example.net/check`.
3. Open the console under its address and create the first administrator, as [First start](/operate/first-start) describes.
4. If you use DNS honeytokens, test the delegation as [DNS honeytokens](/guides/dns-honeytokens#check-that-it-works) describes.
5. Create an [alert channel](/guides/alerting) and send a test message.
6. Set up the monitoring of [Metrics](/operate/metrics#suggested-alerts), so that you notice a stopped worker.
7. Go through the [hardening checklist](/operate/hardening).
