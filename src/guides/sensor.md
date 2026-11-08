---
title: Sensor
description: Install, configure and run nyktus-sensor, and what each honeypot service does and does not do.
---

# Sensor

The sensor `nyktus-sensor` runs your [honeypots](/guides/honeypots) inside the network you monitor. It listens where you tell it to, answers attackers like the real service would, offers nothing behind the login, and reports every session to your trigger. It is a separate program with a configuration file of its own, and it shares nothing with the server except the secrets of the honeypots: it runs on hosts that attackers can reach, so it knows only what it needs to report. This page helps you set up a sensor and run it safely.

## What it does and does not do

- It runs as an ordinary user and needs no privilege except a port below 1024, if you choose one.
- It never executes, interprets or passes on what an attacker sends. A Telnet, SSH or PostgreSQL honeypot reads a user name and a password or a public key, counts them and refuses them. An LDAP honeypot reads a bind and a search and answers the search with nothing. There is no shell, file, command, SQL, directory entry or forwarded port.
- It keeps no password. It reports the length, and of a public key the fingerprint.
- It limits everything an attacker can use up: connections, bytes, time and logins.
- It reads no environment variables for its configuration, loads nothing from the internet and sends nothing anywhere except the reports to your trigger.
- It reports one event for each session, when the session ends.

## Install

The sensor is released apart from the server, under its own tag `sensor/vX.Y.Z`. It is one static binary that you may rename, with a YAML parser and the SSH library of the Go project as its only dependencies. Download the archive for the host, the checksums and their signature, and check them as [Deploy](/operate/deploy#get-the-release) shows for the server. The identity of the signature ends with `@refs/tags/sensor/v` instead of `@refs/tags/v`:

```sh
base=https://github.com/Nyktus/nyktus/releases/download/sensor/v0.1.0
curl -fLO "$base/nyktus-sensor_0.1.0_linux_amd64.tar.gz"
curl -fLO "$base/checksums.txt"
curl -fLO "$base/checksums.txt.sigstore.json"
cosign verify-blob checksums.txt --bundle checksums.txt.sigstore.json \
  --certificate-identity-regexp '^https://github.com/Nyktus/nyktus/\.github/workflows/release\.yml@refs/tags/sensor/v' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
sha256sum --check --ignore-missing checksums.txt
tar -xzf nyktus-sensor_0.1.0_linux_amd64.tar.gz nyktus-sensor
```

Archives exist for Linux on x86-64 and arm64 and for macOS on arm64. `nyktus-sensor version` prints the version, which the sensor also sends with every heartbeat:

```text
0.1.0
```

To build the sensor from the source instead, run `make build`, which writes `bin/nyktus-sensor` next to `bin/nyktus`. A build from a checkout reports `devel` as its version, because the toolchain does not read the tag of a module in a subdirectory.

Update the server before the sensors. The server refuses a report of a version it does not know.

## Set it up

1. [Create the honeypot](/guides/honeypots#create-one). The response holds the `secret` and the `sensor_config` entry. You can read both again later, see [Read the secret again](/guides/honeypots#read-the-secret-again).
2. Write the configuration file with the address of your trigger and the entry:

   ```yaml
   trigger_url: https://t.example.net/
   honeypots:
   - id: "7d2a51c4-3b8e-4f0a-9c6d-1e2f3a4b5c6d"
     service: "telnet"
     # Address and port to listen on. Ports below 1024 need CAP_NET_BIND_SERVICE.
     listen: ":23"
     secret: "<the secret of the honeypot>"
   ```

   `listen` defaults to the usual port of the service. Change it where the host needs another address or port. To run several honeypots on one sensor, add one entry for each. Every honeypot has its own secret.

3. Make the file readable by the sensor's user only, with `chmod 600`. The sensor refuses a file with a secret that its group or others can read or write. It runs on Linux and other Unix systems and does not support Windows.
4. Check the file, then run the sensor:

   ```sh
   nyktus-sensor check -config /etc/nyktus-sensor/sensor.yaml
   nyktus-sensor run -config /etc/nyktus-sensor/sensor.yaml
   ```

   `check` lists every problem it finds, such as unknown keys, duplicate addresses, ids or secrets, a missing host key, and the modes of the files. It binds no port and does not contact the trigger. After a start, the honeypot is `online` in the console within seconds.

The sensor reads its configuration once. Change the file and restart the sensor.

### Configuration

The file is YAML. A key the sensor does not know, a value of the wrong kind and a second document are errors, not ignored.

| Key | Default | Description |
|---|---|---|
| `trigger_url` | required | The public address of your trigger, without a path. `https` is required outside development. Reports go to `/`. |
| `environment` | `production` | `development` allows an `http` `trigger_url`, which sends the secret in the clear. |
| `log_level` | `info` | `debug`, `info`, `warn` or `error`. |
| `honeypots` | required | One entry for each honeypot, at most 32. |

Every entry of `honeypots`:

| Key | Default | Description |
|---|---|---|
| `id` | required | The identifier of the honeypot in the console. The sensor logs it. |
| `service` | required | `telnet`, `ssh`, `postgres` or `ldap`. |
| `listen` | required | `host:port` or `:port`. An empty host takes every address of both families. `0.0.0.0` takes IPv4 only. Entries must not conflict. |
| `secret` or `secret_file` | one is required | The secret, or the file that holds it. |
| `banner` | by service | What the service says first. See the services below. |
| `login_prompt` | `login: ` | The prompt for the user name, up to 64 bytes of printable ASCII. Telnet only. |
| `host_key_file` | required for `ssh` | The file with the private key of the server. A relative path is relative to the configuration file. |

### Secrets in files

An entry can name a file instead of holding the secret, so that the configuration file can be shared or kept in version control:

```yaml
- id: "7d2a51c4-3b8e-4f0a-9c6d-1e2f3a4b5c6d"
  service: "telnet"
  listen: ":23"
  secret_file: /etc/nyktus-sensor/telnet.secret
```

Give an entry `secret` or `secret_file`, not both. The file holds the secret and an optional line break, and only its owner may access it (`chmod 600` or `400`). The sensor checks the mode of the file it has opened. With a container or a service manager that supplies secrets as files, mount them with a mode of `0400` for the user of the sensor, in Kubernetes with `defaultMode: 0400` and `runAsUser`, not `0440` with a group.

## The services

### Telnet

A banner that every installation shares is one that a scanner can look for, so change it to what a device in your network would show. The default is that of a Linux server. A switch of a network vendor:

```yaml
banner: "\r\nUser Access Verification\r\n\r\n"
login_prompt: "Username: "
```

The sensor sends the banner exactly as written, so write line breaks as `\r\n` inside double quotes. The banner may have up to 256 bytes of printable ASCII, with line breaks and tabs. The prompt for the password is always `Password: `.

### SSH

The honeypot speaks the SSH protocol with the library of the Go project, announces a common OpenSSH, and refuses every login. It records the user name, the length of each password, the fingerprint of every key the client offers, and the version string of the client. A key is only recorded and refused. There is never a channel, shell, command, forwarded port or subsystem. The sixth refused login ends the connection, as the default of OpenSSH does.

**The host key.** The honeypot needs a host key, and it has to stay the same: a key that changed with every start would tell anyone that the server is a decoy, and a client that remembers the key would warn of a man in the middle. The sensor creates none. Create one once for each SSH honeypot, without a passphrase:

```sh
ssh-keygen -t ed25519 -N '' -f /etc/nyktus-sensor/ssh_host_key_7d2a51c4-3b8e-4f0a-9c6d-1e2f3a4b5c6d
chmod 600 /etc/nyktus-sensor/ssh_host_key_7d2a51c4-3b8e-4f0a-9c6d-1e2f3a4b5c6d
chown nyktus-sensor /etc/nyktus-sensor/ssh_host_key_7d2a51c4-3b8e-4f0a-9c6d-1e2f3a4b5c6d
```

- Use a key of its own, never the host key of a real server, which anyone who captures the honeypot would know.
- Give every SSH honeypot a different key. Two honeypots that share one can be tied together, and the sensor refuses such a configuration.
- The sensor refuses a key that its group or others can read or write, a key with a passphrase, a key that is not Ed25519 and a file larger than 8 KiB. In a container, mount it like a secret file with the mode `0400`.

**Version and algorithms.** `banner` is the identification string the server sends first, without the line ending. The default is that of Ubuntu 22.04. Change it to what the servers in your network announce, such as `SSH-2.0-OpenSSH_9.2p1 Debian-2+deb12u3`. It starts with `SSH-2.0-`, then a software version without a space or a minus, and optionally a space and a comment, at most 253 bytes of printable ASCII.

The honeypot offers the algorithms of the SSH library, not those of OpenSSH, and an Ed25519 host key only. A tool that compares the lists, such as `ssh-audit`, can tell it from the OpenSSH it names. The library offers no broken or deprecated algorithm, so a client that knows nothing newer than SHA-1, CBC or 1024-bit groups, such as old embedded devices and some bots, fails the key exchange and shows up as a connection with its version.

The library starts goroutines of its own, and a panic in one of them ends the process. Run the sensor so that the service manager restarts it, as the unit below does.

### PostgreSQL

The honeypot speaks the protocol up to the login and refuses it. It records the user, the database the client asked for and its `application_name`, asks for the password in clear text, counts its length and answers with `28P01`, `password authentication failed for user "..."`, as a server does for an unknown user. The connection then ends, so a session holds one login. It reads no query and runs no SQL.

It offers no encryption: a request for TLS is answered with `N`, and the client goes on in clear text, as `psql` does with `sslmode=prefer`. A client that insists on TLS goes no further and is reported as a connection. A current server asks for a SCRAM password, which does not reveal its length, so a client sees a request that a current server would not send. `banner` has no effect and is refused.

### LDAP

The honeypot speaks the part of LDAP that a scanner or a tool that maps a domain uses: bind, search and unbind. It records the name and the password length of a bind and the base and filter of the first search, and answers every search with an empty result, also the search of the root of the directory with which most tools start.

A bind with a name or a password fails with `invalidCredentials` and counts as a login. An anonymous bind succeeds, so that a client goes on to its search, and is not recorded as a login. The sixth refused bind is the last. There is no LDAPS and no StartTLS, and `banner` has no effect and is refused.

## Limits

The limits are fixed. They bound what an attacker can use up and are not settings, so that a configuration cannot lift them by mistake.

| Limit | Value |
|---|---|
| Open connections of a honeypot | 128. Further connections are closed at once. |
| Open connections from one source | 8, where a source is an IPv4 address or an IPv6 network of /64. |
| Duration of a session | 2 minutes. The sensor closes the connection and reports the session. |
| Silence | 30 seconds without a byte from the client, 10 seconds for a client that does not read. |
| Data from one client | 16 KiB for the whole connection. |
| Logins of a session | 6, passwords and offered SSH keys together. A PostgreSQL session holds one. |
| Kept of what the client sent | User name 256 bytes, SSH client version 128 bytes, PostgreSQL database and application 64 bytes each, LDAP base and filter 256 bytes each. Nothing of a password except its length. |

The sensor keeps no table of sources beyond the open connections, so a flood from many addresses costs memory in proportion to the connections it holds, at most 128.

## How reports are delivered

A report waits in a queue with room for 256 sessions of each honeypot and is sent by four workers. Because the trigger answers every report alike, the sensor cannot tell whether one was stored. It repeats a request only when the transport fails: a refused connection, a timeout, a certificate that is not accepted, or a proxy in front of the trigger that answers 502, 503 or 504. It repeats at most three times, after 1, 3 and 9 seconds, follows no redirect, and sends the secret to the configured address and to no other.

The server takes the age of a session within five minutes. A session that waits longer is dropped and counted. A session is also dropped when its honeypot's share of the queue is full, so that a flood at one honeypot does not take the places of the others.

The sensor sends a heartbeat for each honeypot when it starts and every five minutes. Heartbeats do not use the queue, so neither a slow trigger nor an attacker who fills the queue can make a honeypot look offline.

On `SIGTERM` or `SIGINT` the sensor stops listening, reports the sessions that are open, and delivers what is queued for up to 15 seconds. A second signal ends it at once. A sensor that cannot bind a port exits with 1 and starts nothing: a sensor that ran fewer honeypots than you configured would look healthy and watch nothing.

## TLS and a private authority

The sensor verifies the certificate of the trigger in every case, and there is no setting to turn that off. TLS 1.2 or later is required. If your trigger uses a certificate from a private authority, set `SSL_CERT_FILE` for the sensor process to a PEM file with the authority's certificate, for example in the unit below: `Environment=SSL_CERT_FILE=/etc/nyktus-sensor/ca.pem`. On other systems, add the authority to the certificate store. A sensor that cannot verify the certificate cannot report: the honeypot stays `offline` or `never`, and the log says the heartbeat was not delivered.

The sensor sends no request through a proxy from its environment, because the secret would travel to it. To route reports through a relay, put the relay in front of the trigger and name it in `trigger_url`.

## Run it

### systemd

Create a user for the sensor and give it the files. This unit lets the sensor listen on ports below 1024 without being root:

```ini
[Unit]
Description=Nyktus sensor
After=network-online.target
Wants=network-online.target

[Service]
User=nyktus-sensor
ExecStart=/usr/local/bin/nyktus-sensor run -config /etc/nyktus-sensor/sensor.yaml
Restart=on-failure
RestartSec=5s

# Ports below 1024, and nothing else.
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
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

The sensor writes no file. Remove `AmbientCapabilities` if every honeypot listens on a port from 1024. Restart the service after you change the configuration.

### Containers

The image `ghcr.io/nyktus/nyktus-sensor` holds the binary of the archive, for Linux on x86-64 and arm64, with no shell. It runs as the user `65532` and starts `nyktus-sensor run -config /etc/nyktus-sensor/sensor.yaml`, so mount the directory with your configuration at `/etc/nyktus-sensor`. Check its signature like that of the archive, with `cosign verify` and the same identity. `deploy/compose/sensor.compose.yaml` of the source runs it with the settings below.

A secret file and a host key file that the configuration names must not be readable by the group or by others, or the sensor refuses to start. Give them to the user `65532` with the mode `0600`.

Run the sensor as a user other than root, with a read-only root file system, all capabilities dropped and `no-new-privileges`, and let it listen on a port from 1024. Map the port you want on the host to the port in the container, such as `-p 23:2323` with `listen: ":2323"`. The report names the port that the attacker reached *in the container*, here `2323`. Mount the configuration file and the secret files so that only the user of the container can read them.

The sensor reports the address it sees on the connection. Some ways of publishing a port, such as the user-space proxy of Docker or a masquerading rule, replace the attacker's address with the gateway's, and every event then names the gateway. Publish the ports in a way that keeps the source address, for example with host networking, and check with a connection from another host that the event names it.

### Where to put it

Put the sensor where an intruder who moves through the network would look: in the segment of the servers, of the management network or of the devices that the honeypot imitates, on a host with no other purpose. Exclude the addresses of honeypots from your own vulnerability scanners and inventory tools, or give the honeypot a higher severity only if nothing in your network should ever reach it.

## Replace a secret

Replace the secret in the console, put the new one into the configuration or the secret file, and restart the sensor. The old secret stops working in the console at once, so the sensor reports in vain until it restarts, and the honeypot is `never` until it reports with the new one.

## Logs

The sensor writes JSON, one record per line, to standard error. The records name the honeypot and carry counts. They never hold a secret, a user name, a password or anything else an attacker typed. What an attacker can cause at will, such as refused connections or dropped sessions, is counted and written once a minute, not once for each occurrence.
