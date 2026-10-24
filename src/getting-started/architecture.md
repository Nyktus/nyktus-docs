---
title: Architecture
description: The roles of the Nyktus server, the sensor, and where each one runs.
---

# Architecture

Nyktus is one server binary, `nyktus`, and one sensor binary, `nyktus-sensor`. PostgreSQL is the only other component. This page shows the parts and what each one may reach, so that you can decide which hosts run which role.

<ArchitectureDiagram />

## The server roles

The server runs one or more roles in a process. You choose them with `--roles`, for example `nyktus serve --roles=console,worker`.

| Role | What it does | Where it runs |
|---|---|---|
| `console` | Serves the API and the web console. | Internal |
| `trigger` | Answers the URLs of honeytokens and receives the reports of sensors. | Internet-facing |
| `dns` | Is the authoritative name server for the zones of DNS honeytokens. | Internet-facing |
| `worker` | Correlates events into incidents, delivers alerts and runs scheduled jobs. | Internal, outbound connections only |

The roles never talk to each other. They communicate only through PostgreSQL, and each connects with a database role of its own that holds only the privileges the role needs.

### What the internet-facing roles can reach

The `trigger` and `dns` roles can read no table. For each request they hand one value to a database function, which records the event and returns only what the answer needs. Someone who takes over such a host can test a URL, a name or a secret they already know. They cannot list your honeytokens or honeypots.

The `worker` reads events and writes incidents and alerts, but reads no honeytokens, accounts or audit entries. The `console` manages everything else; it can write the secrets of an alert channel but cannot read them back.

Nyktus refuses to start outside development when a login has more privileges than its role needs, for example a superuser or a login of the console used for the trigger. A mistake in the setup of the database therefore stops the server instead of widening an internet-facing host.

## The sensor

The sensor runs the honeypots. It listens inside the network you monitor, answers like SSH, Telnet, PostgreSQL or LDAP, offers nothing behind the login, and reports each session to the trigger with a `POST` that carries the secret of the honeypot. It needs no inbound connection from Nyktus and loads nothing from the internet.

Install the sensor on a host that has no other purpose, in the segment where an intruder who moves through the network would look.

## Where to run what

Nyktus is built so that the console and the alert path sit outside the environment they watch. An intruder who controls the monitored network should neither see which assets are decoys nor be able to suppress the alert.

- **Trying it out:** one process can run all roles. It then holds the database login of every role, so the internet-facing roles lose the separation described above. Use it to try Nyktus; separate the roles for operation.
- **Operation:** run `trigger` and `dns` on a host of their own that the internet can reach, behind a reverse proxy in the case of the trigger. Run `console` and `worker` on internal hosts outside the environment they watch. The address of the trigger and the address of the console must use different hosts.
- **PostgreSQL:** run one Nyktus installation per PostgreSQL cluster, because database roles are global to a cluster.

Sensors report to the trigger over HTTPS and send nothing else, so the monitored network needs outbound access to that one address.
