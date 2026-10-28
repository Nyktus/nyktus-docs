---
title: Accounts
description: Roles, activation and password reset links, removing a second factor, and what to do when no administrator can sign in.
---

# Accounts

Administrators create and manage the accounts of the console. There is no public registration. Every account has an email address, which is its sign-in name and cannot be changed, a display name and a role. With an [identity provider](/operate/sign-in#identity-provider), the accounts of its users are created when they first sign in, and their roles follow their groups there. This page covers the decisions of an administrator: the roles, how a new user gets a password, and how you recover access.

## Roles

| Role | Purpose |
|---|---|
| `admin` | Manages the installation: accounts, API keys, alert channels and settings. Reads the audit log and does everything a `user` does. |
| `user` | Configures honeypots, honeytokens, scenarios and artifacts, and works with incidents. |
| `viewer` | Reads decoys, scenarios, artifacts, incidents, events and the deception catalog. Does not triage incidents and does not read the audit log. |

[Roles and permissions](/operate/permissions) lists what each role may do. Decoys, scenarios and API keys belong to the team, not to the account that created them. You cannot demote, deactivate or delete your own account, nor change the role of an account of the identity provider. A new role or status ends every session of the account.

At least one active administrator always remains. Nyktus rejects every change that would demote, deactivate or delete the last one, also when two administrators try it at the same time. To hand over the installation, create an account for the new administrator, and let the new administrator remove the old account.

## Create an account and pass on the link

Create an account with [`POST /api/v1/users`](/api/reference/users#createUser) or in the console. It starts as `pending`, and the response holds an activation link:

```json
{
  "user": {"id": "<id>", "email": "jane@example.com", "display_name": "Jane Doe", "role": "user", "status": "pending", "totp_enabled": false, "sign_in_method": "password"},
  "activation": {"url": "https://nyktus.example.com/activate#token=<token>", "expires_at": "<expiry>"}
}
```

The new user sets their own password through the link. Administrators never set or see the password of another user.

- **The link is shown once.** Nyktus keeps only a hash of its token, so no later response can show it again. Copy it from the response.
- **Pass it on over a channel that reaches only the new user,** such as a direct message or a call. Whoever opens the link first chooses the password of the account.
- **It is valid for 72 hours and works once.** If it has expired or got lost, [create a new one](/api/reference/users#createActivationLink). The previous one stops working.
- The token is in the fragment of the URL, the part after `#`. Browsers never send the fragment to a server, so it reaches no log of the console or of your reverse proxy.

The password has 12 to 128 characters. The activation does not sign the user in, and it ends a lock after failed sign-ins that someone may have caused before. An unknown, expired or used token gets `404`, like a page that does not exist.

## Change and deactivate

[`PATCH /api/v1/users/<id>`](/api/reference/users#updateUser) changes the display name, the role or the status, or removes the second factor.

- **Deactivating** (`"status": "deactivated"`) blocks the sign-in, ends every session and removes an open activation or reset link. The password is kept.
- **Reactivating** (`"status": "active"`) lets the user sign in again with their password and ends a lock. An account that never set a password returns to `pending` and needs a new activation link.
- **Accounts of the identity provider** follow their groups, so their role cannot be changed here (`409`, `oidc_account`) and they get no reset link. To lock such a user out, deactivate the account. Deleting it does not help, because the next sign-in creates it again.

[`DELETE /api/v1/users/<id>`](/api/reference/users#deleteUser) deletes an account with its sessions and its open link. API keys that the account created stay valid. Entries of the account in the audit log keep a copy of its address and display name.

## Reset a password

Users change their own password while signed in. A user who forgot it receives a reset link from an administrator, because there is no public "forgot password" page. As with the activation, the administrator never sets or sees the new password.

[`POST /api/v1/users/<id>/password-reset-link`](/api/reference/users#createPasswordResetLink) returns the link:

```json
{"url": "https://nyktus.example.com/reset-password#token=<token>", "expires_at": "<expiry>"}
```

- Only active accounts get a reset link, also accounts that are locked after failed sign-ins.
- The link follows the rules of the activation link: shown once, valid for 72 hours, works once, passed on over a channel you trust. A new link replaces the previous one, and an account has at most one open link.
- **Creating the link changes nothing else.** The current password and the sessions stay valid until the link is used. To lock someone out at once, deactivate the account.
- If the user changes the password before using the link, the link stops working. Using it ends every session of the account and a lock. It does not sign in.

A reset leaves the second factor in place, so whoever gets hold of the link still needs a code. An administrator can reset the password of another administrator and then act as that administrator. The audit log shows who created the link.

## Remove a second factor

A user who lost both the authenticator app and the recovery codes cannot sign in. An administrator removes the factor with `PATCH /api/v1/users/<id>` and `{"totp_enabled": false}`, and confirms it with their own password. An administrator of the identity provider leaves the password out and signs in at the provider again within the five minutes before. A wrong password gets `403` with `wrong_password` and counts as a failed sign-in of your account. Only a session can remove a factor, not an API key.

The removal deletes the factor and the recovery codes and ends every session of the account. The user then signs in with the password alone and should set up a new factor right away. Make sure the request really comes from the user, for example by calling them back, because the factor protects against someone who knows the password.

## When no administrator can sign in

If no administrator can sign in, for example because the only one forgot the password, print a password reset link on the server:

```sh
nyktus admin reset-password ada@example.com
```

The command reads the settings of the console (`NYKTUS_CONSOLE_DATABASE_URL` and `NYKTUS_CONSOLE_URL`) and prints the link:

```
Password reset link for ada@example.com. Pass it on to the administrator, who sets a new
password with it. The link works once and is valid until 2026-10-27T19:56:51Z. The current
password and sessions stay valid until the link is used.

    https://nyktus.example.com/reset-password#token=<token>
```

It works only for active administrators who sign in with a password. It fails for another address with `no account has this email address`. If the administrator also lost the second factor and the recovery codes, remove the factor on the server as well:

```sh
nyktus admin remove-totp ada@example.com
```

It removes the factor and the recovery codes of an active administrator and ends every session of the account. It does not need the encryption keys. The audit log records the command line as the actor of both commands.

## Audit and proxy

The audit log records every creation, change, deletion and activation of an account, every new link, every password reset and change, and every removal of a second factor. Changes name the changed fields, not their values. Reads of accounts are recorded at most once per administrator and minute, because accounts contain personal data.

Rate-limit `POST /api/v1/activation` and `POST /api/v1/password-reset` at the [reverse proxy](/operate/reverse-proxy), per client address, like the sign-in.
