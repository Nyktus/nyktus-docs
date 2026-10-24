---
title: Audit log
description: What Nyktus records about security-relevant actions, how to read it, and how long it is kept.
---

# Audit log

Nyktus records security-relevant actions in an audit log in its database. The console can add entries and read them, but never change or delete them. This page says what an entry holds, what is deliberately not in the log, how to collect it, and how long it stays.

## What an entry records

- **Action** in the form `resource.verb`, such as `user.create`, `session.create` or `session.delete`. A request denied for a missing permission names the permission it lacked, such as `audit.read`.
- **Outcome:** `success`, `failure` or `denied`.
- **Actor:** who acted and how they authenticated: a user with a password, through the identity provider (`oidc`) or with a session, an API key with its identifier, or the holder of the setup token. The command line and the worker, which closes inactive incidents, act as the system. For a user the entry keeps a copy of the address and display name at that time, and for a key a copy of its name, so it stays readable after the account is deleted or the key revoked.
- **Resource** by type and identifier, never by name. Updates name the changed fields, never their values.
- **Client address** and **request ID**, which links the entry to the [log](/operate/logs) records of the request.

### What is not in the log

- **Requests without valid credentials** are not recorded, so that anonymous clients cannot fill the audit log. The access log records them. A failed sign-in for an unknown address is recorded without the address.
- **Repeated reads and denials** are recorded at most once per user or API key, action and minute, so that a signed-in user or a key cannot fill the log by repeating them. This covers reads of the audit log and of events, which contain personal data, downloads of artifacts, and requests denied for a missing permission. The access log records every one.
- **Retention deletions.** The worker's deletion of old entries and events is not an entry. The log of the worker records how many rows each run deleted.
- **Values of changes, secrets and reads of incidents.** Updates name fields, not values. A new secret of a honeypot is recorded as `honeypot.update` with the field `secret`, never its value. Incidents hold no personal data, so their reads are not recorded.

### Some entries that need explanation

- A sign-in through the identity provider is recorded once the provider has confirmed the user. The first one creates the account, recorded as `user.create` with the new account as actor. A change of role or name that the provider reports is recorded as `user.update`, and so is the deactivation of a user who is in none of the configured groups. A rejected sign-in of an account is a failure of `session.create` with the account. The log of the console names the reason, the issuer and the subject.
- A user of the provider who signs in there again to confirm a sensitive action is recorded as `session.reauthenticate`, successful or not.
- Deleting a scenario records `scenario.delete` and an entry for every honeytoken, honeypot and artifact it removes or deletes, in the same transaction. Applying a deception records the creation of the scenario, every honeytoken and every artifact, also in one transaction.
- Creating and changing an alert channel is confirmed with the password. A failed confirmation is a failure of `alert_channel.create` or `alert_channel.update`. A test is `alert_channel.test`, and the retry of a dead delivery `alert_delivery.retry`.

## Read the audit log

Administrators open the audit log in the console, and a script reads it with [`GET /api/v1/audit-entries`](/api/reference/audit#listAuditEntries), with a session or with an API key that has `audit:read`. The console page has no filter yet, so read the entries through the API to collect or search them. Every read is itself recorded as `audit.read`.

Entries come from the newest to the oldest, 50 per page by default and at most 200. Entries recorded meanwhile do not shift the following pages.

Entries are ordered by the time they were written, not by the time their action was committed. An action that took long to complete can therefore appear behind entries you have already read. If you collect entries regularly, for example into a SIEM, read again from a few minutes before the newest entry you have and skip the identifiers you already know.

## Personal data

Entries contain addresses, display names and client addresses of users. Restrict access to the audit log, and to backups of the database, accordingly.

Nyktus records them to prove who did what and to investigate misuse of accounts. In the EU, this is usually covered by the legitimate interest in the security of networks and information (Art. 6(1)(f) and Recital 49 GDPR), limited by the retention below. Record it in your records of processing activities.

## Retention

The worker deletes entries older than `NYKTUS_AUDIT_RETENTION_DAYS`, 365 days by default, every hour. The retention is at least 90 days, so that the traces of an intrusion remain long after it was found, and at most 3650 days. The database enforces the lower limit itself: the worker deletes entries only through a function that refuses a shorter retention, and no role of Nyktus can delete entries otherwise.

Backups of the database hold entries beyond the retention. Give them a retention of their own that fits.
