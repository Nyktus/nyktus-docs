---
title: Sign-in and sessions
description: Set up the identity provider, understand how accounts and roles follow it, and know how sessions, second factors and lockouts behave.
---

# Sign-in and sessions

Users sign in to the console with an email address and a password, with a code from an authenticator app if they set up a second factor, or through your identity provider with OpenID Connect. A successful sign-in starts a session, which the browser keeps in a cookie. This page covers what an operator decides and what is not visible in the console: the identity provider, the roles that follow it, the sessions, and what happens after failed sign-ins.

The forms themselves, such as changing a password or setting up a second factor, are in the console and need no explanation here.

## Identity provider

Users can sign in through an OpenID Connect provider such as Keycloak, Microsoft Entra ID, Okta or Authentik. Nyktus then creates their accounts and takes their roles from their groups at the provider.

1. Register Nyktus at the provider as a confidential client with the authorization code flow. The redirect URI is the address of `NYKTUS_CONSOLE_URL` followed by `/api/v1/oidc/callback`.
2. Let the provider put the groups of the user into the ID token, as a list of strings in the claim `groups` or in the claim that `NYKTUS_OIDC_GROUPS_CLAIM` names. Nyktus reads claims only from the ID token.
3. Set `NYKTUS_OIDC_ISSUER`, `NYKTUS_OIDC_CLIENT_ID`, `NYKTUS_OIDC_CLIENT_SECRET` and the groups of each role. See the [configuration](/operate/configuration#sign-in-through-an-identity-provider).
4. Complete the [first start](/operate/first-start) as usual. The first administrator signs in with a password, because the provider cannot create it.

### Accounts and roles

- **An account is created at the first sign-in.** It is named by the issuer and the subject of the provider, never by its email address. Nyktus never links it to an existing account by address: if another account has the address, the sign-in is rejected. Delete the other account first if it belongs to the same person.
- **The provider must report the email address** in the claim `email` and confirm it with `email_verified: true`. Some providers send `email_verified` only when asked to, or not at all, so configure yours to send it. The address is kept as it was at the first sign-in, and the display name follows the claim `name` at every sign-in.
- **The role follows the groups at every sign-in.** The highest role among the groups of the user wins. A change of role ends the other sessions of the account. Administrators cannot change the role of such an account in Nyktus.
- **A user in none of the configured groups cannot sign in**, and their account is deactivated, which ends its sessions. Nyktus learns of a removal from the groups only when the user signs in again, so open sessions continue, at most for `NYKTUS_SESSION_MAX_AGE`. To lock a user out at once, deactivate the account in Nyktus as well.
- **Deleting an account does not lock its user out.** The next sign-in creates it again. Deactivate the account, or remove the user from the groups. A deactivated account stays locked out until an administrator reactivates it, even if the user is added to a group again.
- **The groups cannot demote or deactivate the last active administrator.** Such a sign-in is rejected, and the account stays as it is.
- **Accounts of the provider have no password and no second factor in Nyktus.** The provider handles both. Their users cannot change a password or set up a second factor, and administrators cannot issue password reset links for them.

### Confirming sensitive actions

Creating an API key, removing the second factor of another account, and creating or changing an alert channel other than by renaming it require a fresh authentication, because a taken-over session must not be able to do any of them. A local administrator gives the password with the request. An administrator of the provider leaves it out and signs in at the provider again first. For the next five minutes, that session may perform these actions. Afterwards, or in another session, they get `403` with the code `reauthentication_required`.

The confirmation fails if the provider confirms another user, does not report that it asked for the credentials again (the claim `auth_time`, which the provider must send when asked with `max_age`), or reports groups that no longer give the role of the account. Clocks of Nyktus and the provider may differ by up to a minute.

### Password sign-in with an identity provider

With a provider, only administrators sign in with a password by default (`NYKTUS_LOCAL_LOGIN=admins`). Keep at least one local administrator as emergency access for when the provider is unreachable, and give it a second factor: a local administrator without one bypasses the multi-factor authentication of your provider. Other accounts with a password get the same answer as for a wrong password. `NYKTUS_LOCAL_LOGIN=all` lets every account sign in with its password as well. `off` lets nobody, which leaves no access while the provider is unreachable.

### Availability

- If the provider is unreachable when the console starts, the console starts anyway, logs a warning and tries again every 30 seconds, then less often, up to every 5 minutes. Until it reaches the provider, `GET /api/v1/oidc/authorize` answers `503`, and local administrators sign in with their password.
- A sign-in must be completed within ten minutes. The cookie `__Host-nyktus_oidc` binds it to the browser that started it.
- Signing out ends the session in Nyktus only, not the session at the provider. The next sign-in may therefore complete without a password prompt.
- The requests to the provider bypass the protection against requests to internal addresses that other outgoing requests receive, because the provider is often reachable only internally. They use HTTPS, which is required outside development.

## Sessions

- A session ends after a period without requests (`NYKTUS_SESSION_IDLE_TIMEOUT`, one hour by default) and at the latest after its maximum age (`NYKTUS_SESSION_MAX_AGE`, 12 hours by default), and when the user signs out.
- The cookie `__Host-nyktus_session` is `Secure`, `HttpOnly` and `SameSite=Strict`. The console must therefore be reached over HTTPS.
- The database stores only a hash of the session token. Signing in again ends the session that the browser held before.
- Changing or resetting the password, enabling or removing the second factor, deactivating the account and changing its role end its sessions.
- Integrations use API keys, not sessions. See [Authentication](/api/authentication).

To sign in without the web console, for example to check an installation, send the credentials to the API and keep the cookie, as the quickstart does with `POST /api/v1/session`.

## Second factor

Every account can add a time-based one-time password (TOTP, RFC 6238) from an authenticator app. It is optional and recommended for every account, and in particular for administrators. What is not visible in the console:

- A code is accepted from 30 seconds before until 30 seconds after the period in which the app shows it. Each code works once, and so does each recovery code. The server checks codes against the clock of the database, so keep it synchronized, for example with NTP.
- The ten recovery codes are shown once. Each signs in once in place of a code. Store them outside the device that holds the authenticator app.
- With a second factor, the correct password does not start a session. The sign-in is completed within five minutes with a code or a recovery code.
- The database stores the secrets of the factors encrypted with the encryption keys, and the recovery codes only as hashes. Without the keys, every user with a second factor has to have it removed and set up again.
- A user who lost the authenticator and the recovery codes asks an administrator to remove the factor.

## Failed sign-ins

- A failed sign-in never tells whether the account exists: unknown addresses, wrong passwords and accounts that may not sign in all get the same answer.
- Five failed sign-ins in a row lock the account for 15 minutes. Wrong codes count as well, and so do a wrong current password when changing the password and a wrong password or code when managing the second factor. The count starts again only after a complete sign-in, so the correct password alone does not reset it while the code is missing. A lock blocks the sign-in, not existing sessions. Failures during the lock do not extend it.
- The lock limits how fast codes can be guessed, but does not end the guessing: whoever knows the password can try five codes every 15 minutes. Watch the audit log for repeated failures of `session.create` with the method `totp`, and change the password of an account that shows them.
- Anyone who can reach the sign-in can lock an account, including the only administrator, for 15 minutes at a time. Keep the console off the public internet, and rate-limit sign-ins at the [reverse proxy](/operate/reverse-proxy).
- Every sign-in and change of password, successful or not, and every sign-out is recorded in the audit log with the client address. A sign-in through the provider is recorded as `session.create` with the method `oidc`.

## When the server is busy

Password hashing needs 64 MiB of memory per operation, so the number of concurrent operations is limited. A request that hashes a password, such as a sign-in, setup, activation, password change or reset, and cannot be served within 10 seconds gets `503 Service Unavailable` with a `Retry-After` header.
