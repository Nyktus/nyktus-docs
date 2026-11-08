---
title: First start
description: How the first administrator is created, and how the setup URL is protected.
---

# First start

A new installation has no accounts. The first administrator is created through a setup URL that only the operator of the server can see. There is no public registration: without the URL, whoever reached a fresh installation first could claim it.

This page explains how the setup works and why it is safe to run. [Deploy](/operate/deploy) brings an installation to this point, and the [quickstart](/getting-started/quickstart) runs the steps on one machine.

## Create the first administrator

As long as no administrator exists, the console prints a setup URL to standard output every time it starts, once it is listening:

```
Nyktus has no administrator yet. Create the first one with the setup token in the
following URL, as described in "First start" in the operations documentation.
The token is valid until 2026-10-24T20:49:34Z. Restart Nyktus to get a new one.

    https://nyktus.example.com/setup#token=<the token>
```

The log, which goes to standard error, records only `console: setup pending` with the expiry time, never the URL. In a container, both streams usually end up in the container log, for example in `docker logs`.

Open the URL in a browser. The page asks for the email address, the display name and the password, twice. The password has 12 to 128 characters, and the email address is stored in lower case. The page takes the token out of the address as soon as it opens, so that it does not stay in the history of the browser, and sends it in the body of the request. If you reload the page, the token is gone, and you open the URL again.

Without a browser, send the request to the setup endpoint yourself, as the quickstart shows. See [`POST /api/v1/setup`](/api/reference/setup#createFirstAdministrator).

## How the setup is protected

- **One hour, once.** A setup URL is valid for one hour and works once. If it expires, restart the console to get a new one.
- **Several console processes.** Every console process issues its own URL when it starts, and each one works until it expires, so the setup also works behind a load balancer. Concurrent requests never create more than one administrator.
- **Closed for good.** Once an administrator exists, the console issues no more setup URLs, and the setup endpoint answers every request like a route that does not exist, also after a restart. The last active administrator cannot be demoted, deactivated or deleted, so the setup does not open again.
- **Nothing to learn without the token.** A well-formed request with an unknown, expired or used token gets the answer of a route that does not exist. The fields are checked only for a valid token.
- **The token stays out of logs.** It sits in the fragment of the URL, the part after `#`. Browsers never send the fragment to a server, so it appears in no access log of the console or of a reverse proxy. The database stores only a SHA-256 hash of it.
- **A process that runs several roles** issues the token only after every role has started, so that a role that fails to start leaves no valid token behind.
- **Audit.** The creation of the administrator is recorded in the audit log with the client address and the setup token as the means of authentication.

Treat the setup URL like a password until it has been used or has expired. Anyone who can read the standard output of the console in that time, for example through a central log collection, can use it.
