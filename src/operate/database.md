---
title: Database setup
description: Create the PostgreSQL roles and database that Nyktus needs, and what the worker keeps clean.
---

# Database setup

Nyktus stores all state in PostgreSQL 16 or later. Each server role connects with a login of its own that holds only the privileges the role needs, and migrations run as a separate owner. This page sets that up for an installation you operate. To try Nyktus on one machine first, the [quickstart](/getting-started/quickstart) runs the same steps against a throwaway database.

## The roles

| Role | Kind | Purpose |
|---|---|---|
| `nyktus_owner` (any name) | Login | Owns the database and the `public` schema and runs `nyktus migrate`. A running server never uses it. |
| `nyktus_console`, `nyktus_trigger`, `nyktus_dns`, `nyktus_worker` | Group, created by `roles.sql` | Receive the privileges of their server role through the migrations. |
| One login for each role you run (any name) | Login, member of the group | The server role connects with it, through `NYKTUS_CONSOLE_DATABASE_URL`, `NYKTUS_TRIGGER_DATABASE_URL`, `NYKTUS_DNS_DATABASE_URL` and `NYKTUS_WORKER_DATABASE_URL`. |

The point of this separation is what an internet-facing role cannot do. The trigger and the DNS role can read no table. Each hands one requested value or secret to a database function of its own, which records the request and returns only what the answer and the log need. Whoever takes over the host of the trigger can test a URL, a name or a secret they already know, but cannot list the decoys. A login of the trigger cannot record DNS queries, and the other way round. The worker reads events and writes incidents and alerts, but reads no honeytokens, accounts or audit entries. The console cannot read back the secrets of alert channels. Migrations grant privileges to the group roles and never create roles, so the owner needs no `CREATEROLE`.

Role names are global to a PostgreSQL cluster. Run one Nyktus installation per cluster.

## Set up

Run the following as a superuser such as `postgres`, and choose your own passwords.

1. Create the group roles with `deploy/postgres/roles.sql` from the source. The script can run any number of times, and you run it again after an upgrade that adds a server role.

   ```sh
   psql --file=deploy/postgres/roles.sql
   ```

2. Create the owner and the database. The database must use the `UTF8` encoding, and migrations stop otherwise. If the default encoding of your cluster differs, add `TEMPLATE template0`.

   ```sql
   CREATE ROLE nyktus_owner LOGIN PASSWORD '<owner password>';
   CREATE DATABASE nyktus OWNER nyktus_owner ENCODING 'UTF8';
   ```

   Creating a database for another role needs `CREATEDB` and, since PostgreSQL 16, the right to `SET ROLE` to the owner, which is more than `CREATEROLE`. In a cluster upgraded from PostgreSQL 14 or earlier, the template database can still assign the `public` schema to the bootstrap superuser. Then transfer it: connect to the `nyktus` database and run `ALTER SCHEMA public OWNER TO nyktus_owner;`.

3. Create the logins of the roles you run, as members of their group roles, and do not create them with `NOINHERIT`:

   ```sql
   CREATE ROLE nyktus_console_login LOGIN PASSWORD '<console password>' IN ROLE nyktus_console;
   CREATE ROLE nyktus_trigger_login LOGIN PASSWORD '<trigger password>' IN ROLE nyktus_trigger;
   CREATE ROLE nyktus_dns_login     LOGIN PASSWORD '<dns password>'     IN ROLE nyktus_dns;
   CREATE ROLE nyktus_worker_login  LOGIN PASSWORD '<worker password>'  IN ROLE nyktus_worker;
   ```

4. Apply the migrations as the owner:

   ```sh
   NYKTUS_DATABASE_URL='postgres://nyktus_owner:<owner password>@db/nyktus' nyktus migrate
   ```

5. Start the roles, each with its login. On the first start the console prints the setup URL; see [First start](/operate/first-start).

   ```sh
   NYKTUS_CONSOLE_DATABASE_URL='postgres://nyktus_console_login:<console password>@db/nyktus' \
   NYKTUS_CONSOLE_URL='https://nyktus.example.com' \
   NYKTUS_TRIGGER_URL='https://t.example.net' \
   NYKTUS_ENCRYPTION_KEYS_FILE=/run/secrets/nyktus-keys \
     nyktus serve --roles=console

   NYKTUS_TRIGGER_DATABASE_URL='postgres://nyktus_trigger_login:<trigger password>@db/nyktus' \
   NYKTUS_TRIGGER_DEFAULT_REDIRECT='https://www.example.com/' \
     nyktus serve --roles=trigger

   NYKTUS_DNS_DATABASE_URL='postgres://nyktus_dns_login:<dns password>@db/nyktus' \
   NYKTUS_DNS_ZONES='d.example.net' \
   NYKTUS_DNS_NAMESERVERS='ns1.example.net' \
     nyktus serve --roles=dns

   NYKTUS_WORKER_DATABASE_URL='postgres://nyktus_worker_login:<worker password>@db/nyktus' \
   NYKTUS_CONSOLE_URL='https://nyktus.example.com' \
   NYKTUS_ENCRYPTION_KEYS_FILE=/run/secrets/nyktus-keys \
     nyktus serve --roles=worker
   ```

   The console and the worker need the same encryption keys. Without a worker, events are recorded but never become incidents. The DNS role is needed only for DNS honeytokens, and the settings of every role are in the [configuration reference](/operate/configuration).

When the trigger or the DNS role runs on a host of its own, for example in a DMZ, allow the database connections from that host only for its own login, and over TLS.

## The privilege check

Outside development, the server refuses to start if the login of a role can bypass the separation. It checks that the login is not a superuser, cannot bypass row-level security, cannot create roles or databases, cannot start replication, is not a member of `pg_read_all_data`, `pg_write_all_data`, `pg_read_server_files`, `pg_write_server_files` or `pg_execute_server_program`, and owns neither the database nor the schema. Use the logins above, never the owner.

The trigger and the DNS role refuse to start unless their login can execute its recording function and do nothing else: no table, no other function, no objects in the schema, and no membership in another role, even one it does not inherit from. That catches, for example, the login of the console named by mistake in `NYKTUS_TRIGGER_DATABASE_URL`.

The worker refuses to start unless its login stays within its own tables, executes only the functions of its periodic tasks, and holds no privilege that `nyktus_worker` lacks, such as one granted to the login directly.

## Periodic tasks

The worker keeps the database from growing without bounds. It removes what has expired or passed its retention, at fixed intervals:

| Task | Interval | What it does |
|---|---|---|
| `delete_expired_sign_in_data` | 5 minutes | Removes expired sessions, sign-ins through the identity provider, challenges and unconfirmed setups of a second factor, activation and password reset links, API keys and setup tokens. |
| `delete_expired_audit_entries` | 1 hour | Removes audit entries older than `NYKTUS_AUDIT_RETENTION_DAYS`. |
| `close_inactive_incidents` | 15 minutes | Closes incidents without an event for `NYKTUS_INCIDENT_AUTO_CLOSE_DAYS`. |
| `delete_expired_incident_data` | 1 hour | Removes events, closed incidents with their alerts and deliveries, and tests of channels beyond `NYKTUS_EVENT_RETENTION_DAYS`. |

The table `periodic_tasks` records for every task when it is due, when it last started, succeeded or failed, and how many rows the last run removed. Several workers share the tasks, and each task runs once per interval. A run removes up to 1000 rows of each table at a time until none remain. A run that fails, or is cut short because the worker stops or the run takes longer than ten minutes, starts again within a minute and continues where it stopped.

The worker deletes nothing itself. It calls a function of the database for each task. The function decides what has expired and refuses a retention below its lower limit, so a taken-over worker can at most remove what is due anyway, and its login needs no access to the accounts.

Without a worker, expired rows stay, and so does every sign-in through the identity provider that someone started, which anyone can do without an account.

## Autovacuum

The tables `sessions`, `oidc_logins`, `event_jobs` and `alert_deliveries` change all the time while few of their rows live at once. The migrations lower their autovacuum thresholds, so that dead rows go before they make up much of a table. They need no tuning.

## Backup

Backup the database and the encryption keys, and keep the keys separately. The database alone does not reveal the secrets it holds, such as the URLs of alert channels and the secrets of second factors, and for the same reason it cannot restore them without the keys. A backup of the database also holds events beyond the retention, so give backups a retention that fits `NYKTUS_EVENT_RETENTION_DAYS`.
