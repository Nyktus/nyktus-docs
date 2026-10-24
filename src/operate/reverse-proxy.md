---
title: Reverse proxy
description: What to put in front of the console, the trigger and the DNS role, and what the proxy must not do.
---

# Reverse proxy

Put a reverse proxy in front of the console and in front of the trigger. This page lists what each one needs from it, so that sign-in works, the events carry the right client address, and the proxy gives nothing away.

## The console

- **`NYKTUS_CONSOLE_URL` must be exactly the address users open in the browser**, including the port if it is not the default. A request that changes state, such as a sign-in, is rejected with `403` and the code `cross_origin` when the browser reports another origin. This protects sessions against requests from other sites, including pages on other subdomains of your domain. The web console shows the code as a notice that the address in the browser differs from the configured one.
- **Pass the `Origin` header to the console unchanged.**
- **Serve it over HTTPS.** The session cookie is `Secure`, so the console must be reached over HTTPS. Browsers also accept it on `http://localhost` and `http://127.0.0.1` during development.
- **Rate-limit the sign-in routes per client address:** `POST /api/v1/session`, `POST /api/v1/session/second-factor`, `GET /api/v1/oidc/authorize`, `GET /api/v1/oidc/callback`, `POST /api/v1/activation` and `POST /api/v1/password-reset`. Each request to `GET /api/v1/oidc/authorize` stores a sign-in for ten minutes, which the worker removes within five minutes after it expires, and anyone can make it without an account.
- **Keep the console off the public internet.** Anyone who can reach the sign-in can lock an account, including the only administrator, for 15 minutes at a time.

The proxy of the console needs no other care. The console is internal, and only the trigger and the DNS role have to be reached from the internet.

## The trigger

The trigger answers every request in the same way and carries no product header. Keep it that way:

- **Do not let the proxy add headers** that name your organization or software, and do not leave the version of the proxy in a `Server` header.
- **Let the proxy answer malformed requests.** The HTTP server of Nyktus rejects some of them with `400` or `431` before any handler runs, and that answer is its own. A proxy keeps such requests away, and it can limit the rate of requests.
- **Use TLS with a certificate for the trigger host.** Sensors report to the trigger over HTTPS and verify the certificate. A certificate from a private authority needs the authority on the sensor, as the [sensor page](/guides/sensor#tls-and-a-private-authority) describes.
- **Give the trigger a host name of its own.** Nyktus refuses to start if the addresses of the console and the trigger name the same host.

The [stealth considerations](/security/stealth) explain what an intruder can see of the proxy and the trigger host.

## The client address

Nyktus records the address of the client in the audit log and in the events of honeytokens. By default it uses the address of the connection, which behind a proxy is the address of the proxy. List your proxies in `NYKTUS_TRUSTED_PROXIES`, and Nyktus reads the `X-Forwarded-For` header from right to left, skips the addresses of trusted proxies and takes the first other address as the client. A chain of several proxies works as long as all of them are listed.

- Configure each proxy to append the address it received the request from to `X-Forwarded-For`, which most proxies do by default. A proxy that replaces the header works too.
- List only proxies you operate. A client that connects directly cannot set its own address, because Nyktus reads the header only from trusted addresses.
- Write ranges in their canonical form, such as `10.0.0.0/8`, not `10.0.0.1/8`, and IPv4 ranges in IPv4 notation. Entries may carry a port, such as `192.0.2.1:4711`. `X-Real-IP` is ignored.

See [`NYKTUS_TRUSTED_PROXIES`](/operate/configuration#client-addresses) for the details.

## The DNS role

The DNS role is not an HTTP service and needs no proxy. Resolvers reach it on port 53 over UDP and TCP. Do not put a resolver or a load balancer in front that rewrites the source address, because the event records the address that sent the query. See [DNS honeytokens](/guides/dns-honeytokens#delegate-a-zone).
