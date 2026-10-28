---
title: DNS honeytokens
description: Delegate a zone to Nyktus so that a host name that nobody should resolve raises an event.
---

# DNS honeytokens

A DNS honeytoken is a host name that nobody has a reason to resolve. Place it where a tool looks a name up before it connects: as a host in an SSH configuration, a database connection string, a VPN profile, a mapped drive or a script. Whoever uses the tool resolves the name, and Nyktus records an event, even if the connection then fails and even on a host that cannot reach the web. The lookup arrives through the resolvers of the network.

For this, Nyktus is the authoritative name server of one or more zones. This is the role `dns` of the server. This page helps you choose the zones, delegate them and check that it works.

## Choose the zones

A zone is a domain that you delegate to Nyktus, such as `d.example.net`. Every DNS honeytoken has its trigger value as a name under each zone, such as `q3xwz7a2kfm4ub6tyc5nre2lpa.d.example.net`. Names with more labels in front, such as `vpn.q3xwz7a2kfm4ub6tyc5nre2lpa.d.example.net`, count as well, and the event records the labels in front.

Whoever finds a name sees its zone, so choose it with the same care as the [address of the trigger](/guides/honeytokens#the-address-of-the-trigger):

- **Inconspicuous.** Use a domain that names neither Nyktus nor a decoy, ideally not your organization either.
- **Fitting the placement.** With several zones you can pick the one that fits, for example a domain that sounds internal for a configuration file.
- **Stable.** A placed name stops being recorded once its zone is removed. To move to a new zone, add it, place names under it, and remove the old zone when no name under it is placed any more.
- **Valid.** No zone may hold the host of the console or of the trigger, and no zone may contain another or its own name servers. Nyktus refuses to start otherwise.
- **Unlinked.** Zones that share name servers are linked: whoever looks at one sees the name servers of the other. To keep zones apart, run a DNS role of its own for each, on its own address, with its own `NYKTUS_DNS_ZONES` and `NYKTUS_DNS_NAMESERVERS`. Give the console all zones.

Set `NYKTUS_DNS_ZONES` for the DNS role and for the console. The console shows the names and refuses to create a DNS honeytoken while it knows no zone (`422`, `dns_not_configured`).

## Delegate a zone

1. Choose host names for the name servers outside the zones, such as `ns1.example.net`, and point them at the public address of the host that runs the DNS role:

   ```
   ns1.example.net.   A     203.0.113.10
   ```

2. In the parent zone of each zone, delegate the zone to them:

   ```
   d.example.net.     NS    ns1.example.net.
   ```

   Use two name servers on different hosts and networks, each running a DNS role with the same zones, so that the zone stays reachable when one fails. If a name server lies inside the parent zone itself, its address record is needed there as glue; the registrar or DNS provider of the parent creates it with the delegation.

3. Start the DNS role with the zones and the name servers:

   ```sh
   NYKTUS_DNS_DATABASE_URL_FILE=/run/secrets/nyktus-dns-db \
   NYKTUS_DNS_ZONES='d.example.net' \
   NYKTUS_DNS_NAMESERVERS='ns1.example.net' \
   NYKTUS_DNS_ANSWER_IPV4='203.0.113.80' \
     nyktus serve --roles=dns
   ```

   `NYKTUS_DNS_ANSWER_IPV4` and `NYKTUS_DNS_ANSWER_IPV6` are the addresses with which every name of the zones resolves. They have no default, because an address built into Nyktus would identify it. Point them at a host you control, such as the reverse proxy of the trigger, so that a tool that connects to the name reaches it instead of failing at once. Without them, the names exist but have no address.

The DNS role listens on `127.0.0.1:8053` by default. Resolvers reach name servers on port 53 over UDP and over TCP, and both are required, because an answer that does not fit into a UDP packet is repeated over TCP. Allow port 53 from the internet to the host of the DNS role, and nothing else. In a container, map port 53 of the host to the port of the role, so that the process needs no privilege to bind it: `--publish 53:8053/udp --publish 53:8053/tcp` with `NYKTUS_DNS_ADDR=0.0.0.0:8053`. Do not put a resolver or a load balancer in front that rewrites the source address, because the event records the address that sent the query.

## Check that it works

Create a DNS honeytoken for the test, query its name directly at the name server and then through the public DNS, and look up the delegation:

```sh
dig @ns1.example.net q3xwz7a2kfm4ub6tyc5nre2lpa.d.example.net A
dig q3xwz7a2kfm4ub6tyc5nre2lpa.d.example.net A
dig d.example.net NS
```

The first two answer with the flag `aa` and the address you configured, and each records an event. Delete the test honeytoken afterwards: its events stay.

## What the DNS role answers

The DNS role answers every name under its zones in the same way, whether or not the name holds the value of a honeytoken, whether that honeytoken is enabled or of which type it is, and whether recording the query failed:

- `A` and `AAAA` get the configured addresses. Every other type gets an answer that says the name exists but has no records of that type.
- The zone itself answers `SOA` and `NS` with the configured name servers.
- Queries for names outside the zones, for another class than `IN` (such as `version.bind` in `CHAOS`) and for zone transfers are refused. The DNS role is not a resolver.

The answer is sent before the query is recorded, so a slow or unreachable database neither delays nor changes it. No answer names Nyktus or its version.

Over UDP, an answer is never larger than three times the query, and each source network may send 20 queries per second, with bursts of 50. Beyond that, every second query gets an empty, truncated answer, which makes a real resolver ask again over TCP, and the others get none. This keeps the role from being misused to flood a forged source address.

## What an event records

An event of the DNS role holds the honeytoken with the techniques, severity and scenario it had at that time, when the query arrived, and:

| Field | Content |
|---|---|
| Resolver address | The address that sent the query. This is usually a resolver of the network or provider of whoever looked up the name, not their own address. It still tells you which network the lookup came from. Nyktus does not store the EDNS client subnet, because anyone who queries directly can fill it with any address. |
| Zone | The zone under which the name was queried. |
| Prefix | The labels in front of the value, such as `vpn`, up to 200 characters. Characters other than letters, digits, `-` and `_` are replaced with `?`. The name itself is not stored. |
| Type and transport | The type of the query, such as `A`, `AAAA` or `MX`, and `udp` or `tcp`. |

A lookup usually reaches Nyktus as several queries, for example `A` and `AAAA`, and resolvers repeat queries. Each one is an event, up to the limit of 10 events per honeytoken and minute that covers HTTP and DNS together. A query that cannot be recorded within five minutes, for example while the database is unreachable, is dropped and counted in the log of the DNS role as `dns: queries not recorded`.

## Caching

The first lookup of a name always reaches Nyktus, because nobody can have cached a name that was never resolved. Resolvers then cache the answer for `NYKTUS_DNS_TTL`, one minute by default, and so do some operating systems. A repeated lookup through the same resolver within that time is answered from the cache and never reaches Nyktus. That matters for a tool that looks up the same name again and again, not for the first lookup. A shorter time records more repetitions but causes more queries. `0s` asks resolvers not to cache at all, which not all of them follow.
