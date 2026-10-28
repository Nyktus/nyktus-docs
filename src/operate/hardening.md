---
title: Hardening checklist
description: What to check before an installation holds real data, with a link to the page that explains each point.
---

# Hardening checklist

Nyktus is built so that a wrong setting stops the server rather than weakening it, but some decisions are yours. This page collects them in the order in which you meet them. Go through it after [Deploy](/operate/deploy) and again when the installation changes. Each point links to the page that explains it.

## Topology

- Run `trigger` and `dns` on a host of their own that the internet can reach, and `console` and `worker` on internal hosts outside the environment they watch. A process with several roles holds all their database logins. See [Architecture](/getting-started/architecture#where-to-run-what).
- Use different host names for the console and the trigger. Nyktus refuses to start otherwise. See [Reverse proxy](/operate/reverse-proxy#the-trigger).
- Keep the console off the public internet. Anyone who reaches the sign-in can lock an account for 15 minutes at a time. See [Failed sign-ins](/operate/sign-in#failed-sign-ins).
- Leave `NYKTUS_ENV` at `production`. Development relaxes the checks that protect an installation. See [Configuration](/operate/configuration#all-commands).

## Database

- Create the logins of the roles as [Database setup](/operate/database#set-up) shows, and never start a role with the login of the owner. The server checks this outside development.
- Run one installation per PostgreSQL cluster, because database roles are global to a cluster.
- Allow the connections of the internet-facing host for its own logins only, and over TLS.
- Back up the database and, separately, the encryption keys. Give backups a retention that fits the [retention of events](/guides/incidents#retention) and the [audit log](/operate/audit-log#retention). See [Backup](/operate/database#backup).

## Secrets

- Keep the encryption keys in your secret store. A lost key means lost secrets of second factors and alert channels. See [Encryption keys](/operate/configuration#encryption-keys).
- Make environment files and secret files readable by their administrator or the service account only. Do the same for the configuration and the secret files of every sensor. See [Secrets in files](/guides/sensor#secrets-in-files).
- Treat the setup URL like a password until you have used it. It is printed to standard output, which a log collection may keep. See [First start](/operate/first-start#how-the-setup-is-protected).
- Treat the URL of each honeytoken that reports with a `POST` as a secret on the sender. See [What it costs](/guides/post-reports#what-it-costs).

## Reverse proxy

- Serve the console over HTTPS, and set `NYKTUS_CONSOLE_URL` to exactly the address users open. See [The console](/operate/reverse-proxy#the-console).
- Rate-limit the sign-in routes per client address.
- List every proxy in `NYKTUS_TRUSTED_PROXIES`, and only proxies you operate, so that events and the audit log carry the address of the client. See [The client address](/operate/reverse-proxy#the-client-address).
- Do not let the proxy of the trigger add headers or show its version.

## Accounts and keys

- Give every administrator a second factor. With an identity provider, keep at least one local administrator with a second factor as emergency access. See [Password sign-in with an identity provider](/operate/sign-in#password-sign-in-with-an-identity-provider).
- Grant the role `viewer` only to people who need to see decoys and client addresses. See [Roles and permissions](/operate/permissions).
- Give every integration an API key with the scopes it needs and no more. Leave the inventory scopes and `events:read` out of a SIEM key where you can. Choose an expiry that fits your rotation, and review the keys when people leave. See [Choosing scopes](/api/authentication#choosing-scopes).
- Pass activation and reset links over a channel that reaches only the new user. See [Accounts](/operate/users#create-an-account-and-pass-on-the-link).

## Alerting

- Create at least one alert channel before you place decoys, and send a test message through it. A channel receives only the alerts of incidents that open after it exists. See [Test a channel](/guides/alerting#test-a-channel).
- Keep the allowed networks for alert targets as small as possible. See [Allowed targets](/guides/alerting#allowed-targets).
- For email channels, check that the mail of `NYKTUS_SMTP_FROM` passes SPF, DKIM and DMARC and is not held in a quarantine. See [Mail](/guides/alerting#mail).
- Monitor the delivery of alerts, the worker and the sensors. See [Suggested alerts](/operate/metrics#suggested-alerts).

## Decoys

- Choose a neutral host name for the trigger and a neutral DNS zone, and a default redirect that fits them. See [Stealth considerations](/security/stealth).
- Run each sensor on a host with no other purpose. Change the default banners and create a host key of its own for each SSH honeypot. See [Sensor](/guides/sensor).
- Exclude the addresses of honeypots from your own scanners, or accept their alerts. See [Severity](/guides/honeypots#severity).
- Set dates, owner and location of the artifacts you place so that they match their neighbors. See [Artifacts and placement](/security/stealth#artifacts-and-placement).

## Data protection

- Set `NYKTUS_EVENT_RETENTION_DAYS` and `NYKTUS_AUDIT_RETENTION_DAYS` to what your data protection rules allow. See [Retention](/guides/incidents#retention).
- Restrict who reads events, the audit log and the backups of the database, because they hold client addresses and what attackers typed. See [Personal data](/guides/incidents#personal-data).
- Record the processing in your records of processing activities, and confirm the legal basis with your data protection officer.
