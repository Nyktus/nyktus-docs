---
title: Database setup
description: Set up the PostgreSQL database, the owner and the logins of the server roles with one script, apply the migrations, and learn what the worker keeps clean.
---

# Database setup

Nyktus stores all state in PostgreSQL 16 or later. After this page you have a database with a login for each server role and the migrations applied, from one script and one command. To try Nyktus on one machine first, the [quickstart](/getting-started/quickstart) runs the containers of a release with a throwaway database.

## What the script creates

Each server role connects with a login of its own that holds only the privileges the role needs, and the migrations run as a separate owner:

| Role | Purpose |
|---|---|
| `nyktus_owner` | Owns the database and runs `nyktus migrate`. A running server never uses it. |
| `nyktus_console_login`, `nyktus_trigger_login`, `nyktus_worker_login`, and `nyktus_dns_login` with `--dns` | The login of one server role. Each is a member of the group role of its server role, which the migrations grant the privileges. |

The point of this separation is what an internet-facing role cannot do, which [Architecture](/getting-started/architecture#what-the-internet-facing-roles-can-reach) explains: the trigger and the DNS role can read no table, and each can record only its own kind of request. Role names are global to a PostgreSQL cluster, so run one Nyktus installation per cluster.

## Set up

You need the `psql` client, `openssl`, and a PostgreSQL superuser such as `postgres`. The script `setup.sh` and the file `roles.sql` it uses come with the source in `deploy/postgres/`. Download both from the tag of your release:

```sh
base=https://raw.githubusercontent.com/Nyktus/nyktus/v%%NYKTUS_VERSION%%/deploy/postgres
mkdir nyktus-database-setup && cd nyktus-database-setup
curl -fL -O "$base/setup.sh" -O "$base/roles.sql"
```

Read the script before you run it; it is short. It connects as the superuser you name with the usual `PG*` variables. `--client-host` is the address that the Nyktus hosts use to reach the database, and it goes into the connection URLs. It differs from `PGHOST` when you run the script on the database host itself:

```sh
PGHOST=db.internal.example.net PGUSER=postgres \
  sh setup.sh --client-host db.internal.example.net --dns
```

```text
Created the database nyktus and the logins of: owner console trigger worker dns
The connection URLs are in ./nyktus-database/, one file per login. They hold the passwords.
Next: apply the migrations with the URL of the owner (see Database setup).
```

The script generates a random password for each login and writes it to a file, never to the terminal. The directory `nyktus-database/` then holds one file per login, readable by you only, for example `console.db.env` with the line `NYKTUS_CONSOLE_DATABASE_URL=postgres://nyktus_console_login:<password>@db.internal.example.net/nyktus?sslmode=verify-full`.

| Option | Meaning |
|---|---|
| `--client-host HOST[:PORT]` | The address in the URLs. Default: `PGHOST` and `PGPORT`. |
| `--sslmode MODE` | The `sslmode` of the URLs. Default: `verify-full`, which needs TLS on the database with a certificate for that host name. Use `disable` only on a database that no network reaches. |
| `--dns` | Also create the login of the DNS role, for [DNS honeytokens](/guides/dns-honeytokens). |
| `--out DIRECTORY` | Where the files go. Default: `./nyktus-database`. |
| `--database NAME` | The name of the database. Default: `nyktus`. |

The script stops with a message, and changes nothing, if the owner, a login or the database exists already, so it never resets the password of a running installation. If it fails half-way, drop the roles and the database it named and run it again.

Apply the migrations with the URL of the owner. The subshell keeps the password out of your shell and out of the process list:

```sh
(set -a; . ./nyktus-database/owner.db.env; nyktus migrate)
```

```text
{"time":"2026-11-08T17:03:01.332418+01:00","level":"INFO","msg":"migrate: applied migration","version":1,"name":"initial"}
{"time":"2026-11-08T17:03:01.33342+01:00","level":"INFO","msg":"migrate: done","applied":1,"total":1}
```

Keep `owner.db.env` in your secret store, because every upgrade runs the migrations again, and give each other file to the host of its role. [Deploy](/operate/deploy#settings-of-the-roles) shows where it goes. Delete the directory from the machine where you ran the script.

::: details Set up the database by hand
Use this if you have no superuser, for example on a managed database, or want to name the roles yourself. Run the following as a role that may create roles and databases, and choose your own passwords.

1. Create the group roles with `roles.sql`. The script can run any number of times, and you run it again after an upgrade that adds a server role:

   ```sh
   psql --file=roles.sql
   ```

2. Create the owner and the database. The database must use the `UTF8` encoding, and migrations stop otherwise. Creating a database for another role needs `CREATEDB` and, since PostgreSQL 16, the right to `SET ROLE` to the owner, which is more than `CREATEROLE`:

   ```sql
   CREATE ROLE nyktus_owner LOGIN PASSWORD '<owner password>';
   CREATE DATABASE nyktus OWNER nyktus_owner ENCODING 'UTF8' TEMPLATE template0;
   ```

3. Create the logins of the roles you run as members of their group roles. Do not create them with `NOINHERIT`, and name each in the matching `NYKTUS_<ROLE>_DATABASE_URL`:

   ```sql
   CREATE ROLE nyktus_console_login LOGIN PASSWORD '<console password>' IN ROLE nyktus_console;
   CREATE ROLE nyktus_trigger_login LOGIN PASSWORD '<trigger password>' IN ROLE nyktus_trigger;
   CREATE ROLE nyktus_dns_login     LOGIN PASSWORD '<dns password>'     IN ROLE nyktus_dns;
   CREATE ROLE nyktus_worker_login  LOGIN PASSWORD '<worker password>'  IN ROLE nyktus_worker;
   ```

4. Apply the migrations with `NYKTUS_DATABASE_URL` set to the URL of the owner, as above.

The server checks the logins when it starts, see [the privilege check](#the-privilege-check).
:::

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

Back up the database and the encryption keys regularly, and keep the keys separately. The database alone does not reveal the secrets it holds, such as the URLs of alert channels, the secrets of second factors and the secrets of honeypots, and for the same reason it cannot restore them without the keys. A backup of the database also holds events beyond the retention, so give backups a retention that fits `NYKTUS_EVENT_RETENTION_DAYS`.
