---
title: Stealth considerations
description: What an intruder can observe of a Nyktus installation, and what you can do to make it less.
---

# Stealth considerations

A decoy works best when an intruder does not recognize it. This page lists what an intruder can observe of each part of Nyktus and what you can do about it, so that you can place decoys that give less away.

Nyktus itself marks nothing. The example files of the catalog carry no identifier, no answer of the trigger carries a header that names the product, and the trigger and the DNS role answer every request alike. What an intruder can still see is what you chose, such as a host name, and what the network shows, such as a connection.

## Who this matters for

Most intruders never check a decoy before they touch it. Concealment matters when the intruder:

- reads a file before opening it, or opens it offline,
- watches their own outbound traffic and DNS queries,
- looks up an unfamiliar domain before they connect to it,
- recognizes a known product by its banners, error texts or protocol quirks.

Red teams, insiders and targeted intruders do this. Weigh the effort against who you expect.

## Honeytoken URLs

**In the file.** A URL is the address of your trigger followed by the trigger value. The address is the one you set as `NYKTUS_TRIGGER_URL`, so its host name is your choice and the first thing a reader sees.

- Use a host name that names neither Nyktus nor a decoy, never `canary` or `honeypot`, and ideally not your organization. A neutral domain of its own works best.
- The URL of a `web_image` is not shown when a viewer renders the document, only when someone looks into its source. A QR code hides the URL from a person who reads the page, but the phone that scans it usually shows the address before it opens it.

**When someone looks up the domain.** Registration data, the hosting provider and the certificate tie a domain to its owner. A certificate that browsers trust appears in public certificate transparency logs, with every host name in it. A wildcard certificate puts only the wildcard in the logs.

**On the network.** An intruder who opens or loads the URL sends a request to the trigger host, which their own proxy, firewall and EDR logs show afterwards. The request is already recorded: Nyktus records it even if the client closes the connection at once.

**When someone probes the trigger.** The trigger answers by the form of the request, not by what it knows, so an unknown value, a disabled honeytoken and a value that fired look the same. No header names Nyktus. [What the trigger answers](/guides/honeytokens#what-the-trigger-answers) lists the answers.

- Set `NYKTUS_TRIGGER_DEFAULT_REDIRECT` to a page that fits the host name. Nyktus has no default for it, because a built-in target would be the same in every installation and so a fingerprint.
- The `redirect_url` of a `web_url` is visible to whoever opens the URL. Choose a public page that fits the placement, never an internal address, which would reveal an internal host name.
- Do not let the reverse proxy in front of the trigger add headers that name your organization or software, and do not leave its own version in the `Server` header.

## DNS honeytokens

**In the file.** A DNS honeytoken is a host name under a zone you delegate, such as `<value>.d.example.net`. The reader sees your zone, not Nyktus. Choose a neutral zone, and with several zones the one that fits the placement, for example one that sounds internal for a configuration file.

**When someone queries the zone.** The `NS` records of the zone name the name servers you delegated to, and `SOA` answers there too. Both show that a dedicated authoritative host serves the zone. Every name under the zone gets the same answer whether or not it belongs to a honeytoken, as with a wildcard record. Queries for `version.bind` and zone transfers are refused, and no answer names Nyktus.

- Name the name servers neutrally, outside the zones.
- Zones that share name servers are linked: whoever looks at one sees the name servers of the other. To keep zones apart, run a DNS role of its own for each, on its own address.
- Set `NYKTUS_DNS_ANSWER_IPV4` and `NYKTUS_DNS_ANSWER_IPV6`, ideally to a host you control, such as the reverse proxy of the trigger. Without them, the name exists but has no address, and a tool that resolves it fails at once.

## Honeypots and the sensor

**What a scanner sees.** A honeypot answers like the service it imitates, but it is not that service. These differences are known:

| Service | What differs from the real service |
|---|---|
| Telnet | The banner and the login prompt default to those of a Linux server, the same in every installation, so a scanner can look for them. A switch or a printer says something else: change both. |
| SSH | The identification string defaults to a common OpenSSH, the same in every installation: change it to what your servers announce. The algorithms are those of the SSH library of the Go project, so a tool that compares them, such as `ssh-audit`, can tell the honeypot from the OpenSSH it names. A refused login comes at once, where OpenSSH makes a client wait. |
| PostgreSQL | The refusal reports the source line of version 16, whatever the client expects. It offers TLS only with a certificate of yours. The salt of a user changes when the sensor restarts. |
| LDAP | Every search, including the root of the directory, returns an empty result, and there is no vendor name or version. It offers no TLS. |

- Give every SSH honeypot a host key of its own, created once. A key that changes would tell anyone that the server is a decoy, two honeypots that share a key are tied together, and the key of a real server would be known to anyone who captures the honeypot.
- Put the sensor in the segment where the service would belong, on a host that has no other purpose.

**On the network.** The sensor sends each session report to your trigger, and a heartbeat for each honeypot when it starts and every five minutes. A host that sees the egress of the sensor host sees regular HTTPS requests to the trigger host. Use the same neutral address as for the honeytokens. The sensor sends no request through a proxy from its environment, because the secret would travel to it; if you want a relay, put it in front of the trigger and name it in `trigger_url`.

## Files and placement

The example files of the catalog carry no marker that identifies Nyktus. The catalog refuses a file whose name or text contains a word that reveals a decoy, such as the product name or `canary`. Nyktus renders and changes nothing: every installation offers the same files.

That makes the catalog itself the weakness. It is public, and so are the file names, the account names and the passwords in the files. Whoever knows the project can search for them.

- Change the names and passwords in a file before you place it. Use values that fit your environment, in the form that real files of the kind hold.
- Replace the placeholder for a honeytoken, such as `Honeytoken-Domain`, by the host name or the URL of the honeytoken. A file that still holds one is not placed yet, and the placeholder is a recognizable word.
- Set the name, the dates, the owner and the location of the file so that they match its neighbors. A backup that carries the date of the day you placed it, in a folder where nothing else is recent, looks placed. The guide of each deception says where its files fit.

## What stays visible

- **The alert fires before the intruder can react.** Concealment cannot undo a request that was made.
- **Response times are not equal.** An active value writes an event and an unknown one does not. Only someone who knows a value can measure the difference, and that request is recorded.
- **Malformed requests.** The HTTP server of Nyktus rejects some malformed requests with `400` or `431` before any handler runs, and that answer is its own. A reverse proxy in front of the trigger keeps such requests away.
- **A failing database.** If the trigger cannot record a request, it does not know the redirect target of the honeytoken and sends the client to the default target. Someone who knows a URL with its own `redirect_url` could notice this while the database is unavailable.

No measure makes a decoy invisible to an intruder who controls their own DNS and reads the logs of the resolver. The aim is to raise the effort needed to recognize a decoy, and to make the intruder take active steps that produce evidence of their own.

## Summary

| An intruder who... | sees | You can |
|---|---|---|
| reads a file with a honeytoken URL | the host name of your trigger | use a neutral domain of its own; use a `web_image` or a QR code where the URL should not be read |
| opens or loads the URL | a request to the trigger host in their own logs | accept it; the request is recorded either way |
| probes the trigger host | the same redirect for every path, the same empty `200` for every `POST`, no product header | choose a default redirect that fits; keep the proxy from adding headers |
| looks up the domain | registration data, hosting, certificate | use a neutral domain; use a wildcard certificate |
| reads a file with a DNS name | a name under your zone | use a neutral zone that fits the placement |
| queries the zone | name servers, the same answer for every name | name the name servers neutrally; use a DNS role of its own for zones that must not be linked |
| scans a honeypot | a default banner, library algorithms | change the banner; give each SSH honeypot its own host key |
| watches the egress of the sensor host | HTTPS requests to the trigger host every five minutes | use the neutral trigger address |
| finds an example file | its name, dates, owner and place, and the names and passwords that every installation shares | change names and passwords; place it as the guide says; match its neighbors |
