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

Nyktus records the address of the client in the audit log and in the events of honeytokens. Behind a proxy, it records the address of the proxy unless you list your proxies in `NYKTUS_TRUSTED_PROXIES`.

- Configure each proxy to append the address it received the request from to `X-Forwarded-For`, which most proxies do by default. A proxy that replaces the header works too.
- List every proxy in the chain, and only proxies you operate.

How Nyktus reads the header, how to write the ranges and what it ignores are described in [Client addresses](/operate/configuration#client-addresses).

## The DNS role

The DNS role is not an HTTP service and needs no proxy. Resolvers reach it on port 53 over UDP and TCP. Do not put a resolver or a load balancer in front that rewrites the source address, because the event records the address that sent the query. See [DNS honeytokens](/guides/dns-honeytokens#delegate-a-zone).

## Example: nginx

The console and the trigger run on different hosts, so each host gets its own file. Both assume that Nyktus listens on the loopback address of the same host, which is the default, and that the certificate and the key exist. Replace the host names and the paths.

The console, in `/etc/nginx/conf.d/nyktus.conf` on the internal host. The `map` selects the six sign-in routes, so that the rate limit counts nothing else. The web console reads `GET /api/v1/session` to learn whether you are signed in, so that route must not be limited:

```nginx
# Count only the sign-in routes, per client address. An empty key is not counted.
map "$request_method $uri" $signin_client {
    default                                "";
    "POST /api/v1/session"                 $binary_remote_addr;
    "POST /api/v1/session/second-factor"   $binary_remote_addr;
    "GET /api/v1/oidc/authorize"           $binary_remote_addr;
    "GET /api/v1/oidc/callback"            $binary_remote_addr;
    "POST /api/v1/activation"              $binary_remote_addr;
    "POST /api/v1/password-reset"          $binary_remote_addr;
}

limit_req_zone $signin_client zone=nyktus_signin:10m rate=10r/m;

server {
    listen 443 ssl;
    server_name nyktus.example.com;
    server_tokens off;

    ssl_certificate     /etc/ssl/nyktus/fullchain.pem;
    ssl_certificate_key /etc/ssl/nyktus/privkey.pem;

    location / {
        limit_req zone=nyktus_signin burst=5 nodelay;
        limit_req_status 429;

        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

The trigger, in `/etc/nginx/conf.d/nyktus-trigger.conf` on the host that the internet reaches. It adds nothing to the answers of Nyktus:

```nginx
server {
    listen 443 ssl;
    server_name t.example.net;
    server_tokens off;

    ssl_certificate     /etc/ssl/nyktus/fullchain.pem;
    ssl_certificate_key /etc/ssl/nyktus/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Set `NYKTUS_TRUSTED_PROXIES=127.0.0.1` for both roles. nginx passes the `Origin` header on without change. The rate limit lets a client make 10 sign-in requests per minute, plus a burst of 5, and answers the rest with `429`. Choose values that fit your users, and remember that five failed sign-ins lock an account.

Two things to know about the result:

- `server_tokens off` removes the version of nginx from the `Server` header, but the header still says `nginx`. Nyktus is not named. Removing the header altogether needs a module that stock nginx does not include.
- nginx answers some malformed requests itself, with an error page that names nginx. The page does not name Nyktus.
