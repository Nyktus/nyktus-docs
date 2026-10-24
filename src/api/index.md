---
title: API overview
description: How to call the console API of Nyktus, what it returns and how it reports errors.
---

# API overview

The console serves a JSON API under `/api/v1`. Everything the web console does goes through it, so a script can do the same. This page describes what all operations share. The operations themselves are in the reference pages in the sidebar, which are generated from the OpenAPI specification.

::: warning The API is not stable yet
Until the first tagged release, routes, fields and error codes change without notice. The specification carries the version `0.0.0`.
:::

## Calling the API

Send requests to the address of your console, the one set as `NYKTUS_CONSOLE_URL`, for example `https://nyktus.example.com`. The honeytoken URLs of the trigger are a different address and not part of this API.

- Send and expect JSON. A request with a body needs `Content-Type: application/json`, otherwise the answer is `415`. A body over the limit of the operation gets `413`.
- Every `GET` operation also answers `HEAD`, with the same access rules and no body.
- Every response carries an `X-Request-ID` header. Quote it when you ask someone to look into a failed request: the server log and the audit log carry the same ID.
- Authenticate with an API key or, in a browser, with a session. See [Authentication](/api/authentication).

The health endpoints `/livez` and `/readyz` are at the root and need no authentication; see [Health](/api/reference/health).

## Errors

Every error uses the same envelope:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "<what is wrong, without internal details>",
    "request_id": "<the ID of the request>"
  }
}
```

Match on the HTTP status and on `error.code`, never on `message`: the code is stable and machine-readable, the message is for people. A server error carries a generic message and a `request_id`, which is the key to the log of the server.

| Status | Means | What to do |
|---|---|---|
| `400` | The request body is malformed or a field is invalid. | Correct the request. The message names the field. |
| `401` | No valid session or key. An expired, revoked or unknown key looks the same. | Check the key and its expiry. |
| `403` | The caller lacks the permission, the route admits sessions only, or the request comes from another origin (`cross_origin`). | Give the key the scope the operation lists, or use a session. |
| `404` | The route does not exist or is not available to the caller. | |
| `409` | The request conflicts with the state of the installation. The code names the conflict. | Read the code in the operation's responses. |
| `413`, `415` | The body is too large, or is not JSON. | |
| `422` | The request is well formed but cannot be carried out, for example a DNS honeytoken without a zone. | The code names the reason. |
| `500` | The request failed on the server. | Retry later; report the `request_id` if it persists. |
| `503` | The database is unreachable or the server is too busy. | Wait the seconds that `Retry-After` names, then retry. |

Every operation lists the statuses it can return and what each one means.

## Pagination

Operations that list resources return a page at a time, from the newest to the oldest. They take two parameters:

- `limit`: the number of items, 1 to 200, 50 by default.
- `cursor`: the `next_cursor` of the previous response. The last page has no `next_cursor`.

Pass the same filters with every page. This Bash loop reads all honeytokens and needs `jq`. It encodes the cursor, which may contain characters that a URL does not allow:

```sh
args=(--data-urlencode limit=200)
while :; do
  page=$(curl --fail-with-body --silent --get "<console-url>/api/v1/honeytokens" "${args[@]}" \
    --header "Authorization: Bearer $NYKTUS_API_KEY")
  echo "$page" | jq -c '.honeytokens[]'
  cursor=$(echo "$page" | jq -r '.next_cursor // empty')
  [ -n "$cursor" ] || break
  args=(--data-urlencode limit=200 --data-urlencode "cursor=$cursor")
done
```

Treat a cursor as opaque. Do not build one, and do not keep it for later.
