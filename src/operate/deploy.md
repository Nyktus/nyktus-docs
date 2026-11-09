---
title: Deploy
description: Install Nyktus from a release or with containers, decide whether the trigger is reachable from the internet, and run the roles under systemd or Compose.
---

# Deploy

This page takes you from a release to an installation that runs each server role where it belongs, either as binaries under systemd or as containers. Afterwards your team reaches the console, the trigger answers, and the roles start again after a reboot. [Architecture](/getting-started/architecture) explains the roles.

## Decide where the trigger is reachable

The console and the worker stay internal, outside the environment Nyktus watches. For the trigger you choose, and the choice decides what Nyktus can see:

| | Reachable from the internet (recommended) | Internal only |
|---|---|---|
| Needs | A host the internet can reach, with a reverse proxy | An internal host that your monitored networks can reach |
| Sees | A honeytoken opened anywhere, including a stolen document opened on the intruder's infrastructure; reports of cloud services; sensors in other networks | Only what happens inside the networks that reach the trigger |
| Misses | Nothing of this | Data that leaves the network and is opened outside. Cloud audit-log [webhooks](/guides/cloud-webhooks) and sensors in a cloud network work only if they have a route to the trigger. |

DNS honeytokens need the DNS role on a host that the resolvers of the internet reach, see [DNS honeytokens](/guides/dns-honeytokens). The internal-only variant is a fit for a closed network. Everything else on this page is the same for both; only the host of the `trigger` changes.

## What you need

- **PostgreSQL 16 or later**, reachable from the hosts of all roles. Allow the connections of an internet-facing host for its own login only, and over TLS.
- **Two host names** with certificates, one for the console and one for the trigger. They must differ, and the trigger name should name neither Nyktus nor a decoy, see [the address of the trigger](/guides/honeytokens#the-address-of-the-trigger).
- **A reverse proxy** in front of the console and of the trigger, see [Reverse proxy](/operate/reverse-proxy). The Compose installation below brings one.

## Get the release

Skip this section if you run only containers. Each release publishes an archive per platform for Linux on x86-64 and arm64 and for macOS on arm64. The archive holds `nyktus`, one binary for all roles with the web console embedded, the licence and a notice, and has an SBOM (`*.sbom.spdx.json`) that lists the Go modules in the binary. The sensor is released apart, see [the sensor](/guides/sensor#install).

Download the archive for your platform, the checksums and their signature. Version `%%NYKTUS_VERSION%%` for Linux on x86-64:

```sh
base=https://github.com/Nyktus/nyktus/releases/download/v%%NYKTUS_VERSION%%
curl -fLO "$base/nyktus_%%NYKTUS_VERSION%%_linux_amd64.tar.gz"
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

The first command prints `Verified OK`, the second `nyktus_%%NYKTUS_VERSION%%_linux_amd64.tar.gz: OK`. If either fails, do not use the file. Then unpack the archive and copy `nyktus` to `/usr/local/bin/nyktus` on every server host:

```sh
tar -xzf nyktus_%%NYKTUS_VERSION%%_linux_amd64.tar.gz nyktus
sudo install -m 0755 nyktus /usr/local/bin/nyktus
nyktus version
```

```text
v%%NYKTUS_VERSION%%
```

To build from the source instead, you need Go 1.26 and Node.js 24. Check out the tag and run `make build`, which writes `bin/nyktus` and `bin/nyktus-sensor`.

## Set up the database

[Database setup](/operate/database#set-up) creates the database, a login for each role and the files with their connection URLs, and applies the migrations. Do it before you start a role. The Compose installation below sets up its own database; skip this section for it.

## Settings of the roles

A process reads only the settings of the roles it runs, and a process that runs several roles holds the database logins of all of them. Run each role as a process of its own, with a file of its own. The database login comes from the file that [Database setup](/operate/database#set-up) wrote, so the settings below are the rest. The values are examples; [Configuration](/operate/configuration) lists every setting.

::: code-group

```sh [console.env]
NYKTUS_CONSOLE_URL=https://nyktus.example.com
NYKTUS_TRIGGER_URL=https://t.example.net
NYKTUS_TRUSTED_PROXIES=127.0.0.1
NYKTUS_ENCRYPTION_KEYS=1:<32 random bytes in base64>
```

```sh [worker.env]
NYKTUS_CONSOLE_URL=https://nyktus.example.com
NYKTUS_ENCRYPTION_KEYS=1:<the same key as for the console>
```

```sh [trigger.env]
NYKTUS_TRIGGER_DEFAULT_REDIRECT=https://www.example.com/
NYKTUS_TRUSTED_PROXIES=127.0.0.1
```

```sh [dns.env]
NYKTUS_DNS_ZONES=d.example.net
NYKTUS_DNS_NAMESERVERS=ns1.example.net
NYKTUS_DNS_ANSWER_IPV4=203.0.113.80
```

:::

Generate the key with `openssl rand -base64 32`. The console needs the same `NYKTUS_DNS_ZONES` as the DNS role if you use DNS honeytokens, and the worker needs the SMTP settings if you use email channels. Nyktus listens on the loopback address by default, which suits a reverse proxy on the same host.

Put the file of a role and its `<role>.db.env` side by side on the host of the role, as `/etc/nyktus/<role>.env` and `/etc/nyktus/<role>.db.env`, readable by its administrator only. Keep a copy of the encryption key somewhere else, because without it the encrypted secrets are lost, see [Encryption keys](/operate/configuration#encryption-keys). A variable also accepts a file instead, with the suffix `_FILE`, for secret stores that mount files.

## Run with systemd

One unit template runs every role. The name after the `@` is the role, and the unit reads `/etc/nyktus/<role>.env` and `/etc/nyktus/<role>.db.env`. Save it as `/etc/systemd/system/nyktus@.service`:

```ini
[Unit]
Description=Nyktus %i
After=network-online.target
Wants=network-online.target

[Service]
User=nyktus
EnvironmentFile=/etc/nyktus/%i.env
EnvironmentFile=/etc/nyktus/%i.db.env
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
sudo install -m 0600 console.env worker.env nyktus-database/console.db.env nyktus-database/worker.db.env /etc/nyktus/
sudo systemctl enable --now nyktus@console nyktus@worker
```

On the host of the trigger, install `trigger.env` and `trigger.db.env` the same way and start `nyktus@trigger`. For the DNS role, do the same with `dns.env` and `dns.db.env`. It listens on `127.0.0.1:8053` by default. To let it listen on port 53 without a privilege of the user, give the role a drop-in with `sudo systemctl edit nyktus@dns`, and set `NYKTUS_DNS_ADDR=0.0.0.0:53` in `dns.env`:

```ini
[Service]
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
```

The logs go to the journal: `journalctl --unit nyktus@console`. The console prints the [setup URL](/operate/first-start) to standard output, so it is in the journal too. Treat it like a password until you have used it.

## Run with Compose

The images are `ghcr.io/nyktus/nyktus` for the server and `ghcr.io/nyktus/nyktus-sensor` for the sensor, for Linux on x86-64 and arm64. They hold the binary of the archive and nothing else: no shell, no package manager, and a user without root. Check the signature of an image like that of the archive; the identity is the same:

```sh
cosign verify ghcr.io/nyktus/nyktus:%%NYKTUS_VERSION%% \
  --certificate-identity-regexp '^https://github.com/Nyktus/nyktus/\.github/workflows/release\.yml@refs/tags/v' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

The directory `deploy/compose` of the source holds a reference installation for one host: PostgreSQL with its logins, the migrations, every role and an nginx container that serves the console over HTTPS. It sets up the database itself, so it needs neither the script nor the files of the sections above. Its README is the guide:

- Every setting comes from `.env`. The file lists them, with a command for each secret, and Compose refuses to start while a required one is empty. Leave the example values of the DNS and `trigger-proxy` settings in it if you do not use those profiles, because Compose reads all services.
- The roles run in read-only containers without capabilities, as a user without root. The worker is a container of its own.
- The console is reachable through the proxy only, on the address of `NYKTUS_CONSOLE_BIND`: use an internal address, because the console does not belong on the internet.
- The trigger publishes its port on the loopback address for a proxy of your own, or on the address of `NYKTUS_TRIGGER_BIND` for an internal-only trigger. The profile `trigger-proxy` adds an nginx for it that logs no request and answers like the trigger where it answers itself. The profile `dns` adds the DNS role on port 53.
- The certificates are files you provide. The reference starts no certificate client.
- An upgrade changes `NYKTUS_VERSION`, then `docker compose pull` and `docker compose up --detach`; the migrations run first. Until version 1.0.0, a release can change the initial migration. `migrate` then stops with `applied migration has been modified`, and the database has to be created anew.

### Containers on separate hosts

To run a role on a host of its own, for example the trigger at the edge, use the image with the files of the sections above. The container listens on all of its addresses, and Docker publishes the port on the loopback address for the reverse proxy:

```sh
docker run --detach --name nyktus-trigger --restart unless-stopped \
  --read-only --cap-drop ALL --security-opt no-new-privileges:true \
  --env-file /etc/nyktus/trigger.env --env-file /etc/nyktus/trigger.db.env \
  --env NYKTUS_TRIGGER_ADDR=0.0.0.0:8081 \
  --publish 127.0.0.1:8081:8081 \
  ghcr.io/nyktus/nyktus:%%NYKTUS_VERSION%% serve --roles=trigger
```

For the DNS role, use `serve --roles=dns`, `NYKTUS_DNS_ADDR=0.0.0.0:8053` and `--publish 53:8053/udp --publish 53:8053/tcp`. Without the binary on the host, apply the migrations with the image and the file of the owner:

```sh
docker run --rm --env-file nyktus-database/owner.db.env ghcr.io/nyktus/nyktus:%%NYKTUS_VERSION%% migrate
```

## Check the installation

1. The console answers on the loopback address of its host: `curl --include http://127.0.0.1:8080/readyz` returns `200`. See [Health](/api/reference/health).
2. Any URL on the trigger host answers with a redirect to your default target, and no header names Nyktus: `curl --include https://t.example.net/check`.
3. Open the console under its address and create the first administrator, as [First start](/operate/first-start) describes.
4. If you use DNS honeytokens, test the delegation as [DNS honeytokens](/guides/dns-honeytokens#check-that-it-works) describes.
5. Create an [alert channel](/guides/alerting) and send a test message.
6. Set up the monitoring of [Metrics](/operate/metrics#suggested-alerts), so that you notice a stopped worker.
7. Go through the [hardening checklist](/operate/hardening).
