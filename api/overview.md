---
title: API overview
description: The base URL, authentication, response shapes, rate limits, errors, idempotency and webhooks of the Snapsbrew REST API.
order: 1
---

# API overview

The Snapsbrew REST API renders snaps from templates, and it manages templates, media, screenshots, batches and tags. Each instance serves its own API.

## Base URL

The API is under `/api` on the URL of the instance. The base URL has this form:

```text
https://<your-instance>/api
```

The version is part of each path, for example `/v1/snaps`. The full URL of that endpoint is `https://<your-instance>/api/v1/snaps`.

`APP_URL` sets the host. The examples in these pages use `https://snapsbrew.example`.

The signed image URL is the one exception. It is on the root of the instance, not under `/api`: `https://<your-instance>/signed-url/image.jpg`. See [Signed URLs](signed-urls.md).

## Authentication

Most endpoints need an API token. An API token is a Sanctum personal access token with the `api_requests` ability.

Send the token as a bearer token in the `Authorization` header. Also send `Accept: application/json`, so that errors come back as JSON.

```http
Authorization: Bearer <your-token>
Accept: application/json
```

### Create an API token

1. Sign in to the instance.
2. Open **Account**, then open the **Developers** tab.
3. Under **API access tokens**, type a name for the token.
4. Click **New token**.
5. Copy the token. The page shows it one time only.

The token does not expire. To stop a token, click **Revoke** next to it on the same tab.

If the owner deactivates a user, the API tokens of that user stop working. Requests with these tokens get `401`.

Keep the token on your server. Do not put it in browser code or in a mobile app.

### Token abilities

A token carries one or more abilities. The app uses two abilities.

| Ability | Given to | What it allows |
|---|---|---|
| `api_requests` | Each token that you make under **API access tokens** | The REST API and the MCP server. |
| `signed_url` | The token behind each signed-URL key | Signed image URLs only. See [Signed URLs](../using-snapsbrew/signed-urls.md). |

A token without `api_requests` gets `403` with the message `Invalid ability provided.`

## Endpoint groups

| Group | Page |
|---|---|
| The current token | [Authentication](authentication.md) |
| Static reference catalogs | [Guides](guides.md) |
| Templates and publishing | [Templates](templates.md) |
| The v2 draft of a template | [Editor documents](editor-documents.md) |
| Your image library | [Media](media.md) |
| Web page captures | [Screenshots](screenshots.md) |
| One render | [Snaps](snaps.md) |
| Up to 100 renders | [Snap batches](snap-batches.md) |
| Watermarked HTML previews | [Preview](preview.md) |
| Template labels | [Tags](tags.md) |
| Form submissions without a token | [Embedded forms](embedded-forms.md) |
| Image URLs that a server signs | [Signed URLs](signed-urls.md) |
| Public tools for a marketing site | [Free tools](free-tools.md) |

The instance also serves an OpenAPI file and a Postman collection. See [OpenAPI and Postman](openapi.md). Client libraries exist for four languages. See [SDKs](../sdks/overview.md).

## Response shapes

Most success bodies use one envelope:

- A read returns `{"data": ...}`.
- A list returns `{"data": [...], "meta": {...}}`.
- A write returns `{"data": ..., "message": "..."}`.
- A delete returns `{"message": "..."}` only.

Some endpoints do not use this envelope. The page of each endpoint shows the exact body. These are the known differences:

- `POST /v1/snaps` returns the snap object with no `data` key.
- The batch endpoints return the batch object with no `data` key.
- `GET /v1/media` returns the standard Laravel paginator.
- The editor document endpoints return `document` and `revision` at the top level.
- `POST /v1/templates/{templateUuid}/tags` returns `message` and `tags`.

## Pagination

Two list styles exist.

**Cursor pagination.** `GET /v1/templates` and `GET /v1/screenshots` return `meta.next_cursor` and `meta.previous_cursor`. To read the next page, send the value of `meta.next_cursor` as the `cursor` query parameter. When `meta.next_cursor` is `null`, you have the last page.

**Page pagination.** `GET /v1/media` takes a `page` query parameter. The response is a flat Laravel paginator. It has `current_page`, `per_page`, `total`, `next_page_url` and `last_page` next to `data`. When `next_page_url` is `null`, you have the last page.

`GET /v1/tags` has no pagination. It returns 15 tags or fewer.

## Rate limits

The instance counts requests for each user. If a request has no user, the instance counts it for the IP address.

| Limiter | Limit | Routes |
|---|---|---|
| `api` | 60 requests a minute | Every route under `/api/v1`, except the embedded form route. |
| `preview` | 10 requests a minute | `GET /v1/templates/{templateUuid}/preview` and `GET /v1/snaps/preview`. |
| `editor-document` | 30 requests a minute for one user, and 180 a minute for one company | The four editor document routes. |
| `mcp` | 30 requests a minute | The MCP server at `/mcp`. |
| `embedded-form-submit` | 10 requests a minute for one IP address, and 60 a minute for one form | `POST /v1/embedded-forms/{formUuid}`. |
| `signed-url` | 600 requests a minute for one IP address | `GET /signed-url/image.jpg`. |
| `free-tools` | 5 requests a minute and 50 a day for one IP address | The free tool routes. See [Free tools](free-tools.md). |

The preview and editor document routes also count against the `api` limiter. The embedded form route and the signed URL route do not.

The owner can change the limits of the last three rows with environment variables. See [Embedded forms](embedded-forms.md#submit-an-embedded-form), [Signed URLs](signed-urls.md) and [Free tools](free-tools.md).

Each limited response carries these headers:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 40
```

When you go over a limit, the response is `429`. It also carries `Retry-After` (seconds) and `X-RateLimit-Reset` (a Unix timestamp). If you get `429`, wait for the time in `Retry-After`. Then send the request again.

## Errors

Each endpoint with a bearer token can return `401`, `403` and `429`. The page of each endpoint lists its other statuses.

| Status | When | Body |
|---|---|---|
| `401` | The token is missing, wrong, revoked or belongs to a deactivated user. | `{"message": "Unauthenticated."}` |
| `403` | The token has no `api_requests` ability. | `{"message": "Invalid ability provided."}` |
| `403` | A policy refuses the action, for example a template write from an account that is not a `customer` or an `admin`. | `{"message": "This action is unauthorized."}` |
| `404` | The record does not exist in your company. | `{"message": "No query results for model [App\\Models\\Template]."}` |
| `409` | A conflict. See [Conflict codes](#conflict-codes). | `{"code": "..."}`, sometimes with a `message` |
| `422` | A field failed validation. | `{"message": "...", "errors": {"field": ["..."]}}` |
| `422` | The editor document refuses a `PATCH` operation. | `{"code": "editor_operation_..."}` |
| `429` | A rate limit is full. | `{"message": "Too Many Attempts."}` |
| `500` | `POST /v1/snaps` or `POST /v1/snaps/batches` failed on the server. | `{"message": "...", "code": "internal_error"}` |

A `404` for a missing record names the model class. A missing template names `App\Models\Template`, and a missing screenshot names `App\Models\Screenshot`. A few endpoints use their own `404` message. For example, a missing batch returns `No batch with that id exists in your account.`

A resource from another company returns `404`, the same as a resource that does not exist.

A `422` body has one key for each field in `errors`. The value is a list of messages:

```json
{
  "message": "The title field is required.",
  "errors": {"title": ["The title field is required."]}
}
```

A `429` response carries these headers:

| Header | Value |
|---|---|
| `Retry-After` | The number of seconds to wait. |
| `X-RateLimit-Limit` | The number of requests that the limit allows in one minute. |
| `X-RateLimit-Remaining` | The number of requests that are left in this minute. |

A `500` from `POST /v1/snaps` or `POST /v1/snaps/batches` holds a fixed message and the code `internal_error`. The body gives no detail of the cause. The instance writes the cause to its log. Give the `X-Request-Uuid` header of the response to the person who runs the instance.

Do not branch on the text of `message`. The text can change. Where an endpoint returns a `code`, branch on the `code`.

### Conflict codes

| `code` | Endpoint | Cause | What to do |
|---|---|---|---|
| `idempotency_key_in_progress` | `POST /v1/snaps`, `POST /v1/snaps/batches` | Another request with the same key is in progress. | Wait a short time. Then send the request again with the same key. |
| `idempotency_key_belongs_to_batch` | `POST /v1/snaps` | A batch owns the key. | Send a new key. |
| `idempotency_key_belongs_to_snap` | `POST /v1/snaps/batches` | A single snap owns the key. | Send a new key. |
| `editor_document_conflict` | `PATCH` and `PUT /v1/templates/{templateUuid}/document` | The stored revision moved. | Read `current_document` and `current_revision`. Then apply your change again. |
| `legacy_edit_rejected_for_v2` | `PATCH /v1/templates/{templateIdentifier}` | The template uses the v2 editor document. | Use [Editor documents](editor-documents.md). |

For each `409`, the instance saved nothing and created nothing.

An editor document conflict returns the current state of the document:

```json
{
  "code": "editor_document_conflict",
  "current_revision": 5,
  "current_document": {"version": 2, "layers": [], "groups": []}
}
```

## Request IDs

`POST /v1/snaps`, the batch endpoints and the embedded form route return an `X-Request-Uuid` header. The value is the ID of the row in the usage log. Keep it when you report a problem to the person who runs the instance.

## Usage log

The usage log keeps a row for each logged request and the number of renders of that request. Routes that the `logApiRequest` middleware wraps go into the usage log:

- `GET /v1/auth`
- `GET /v1/templates`, `GET /v1/templates/sizes` and `GET /v1/templates/{templateUuid}`
- The screenshot routes
- The tag routes
- `POST /v1/snaps` and the batch routes

The guide routes, the preview routes, the media routes, the template writes and the editor document routes do not go into the usage log. Signed URLs and embedded forms write their own rows. Rendering has no limit. The usage log is a history only.

## Idempotency keys

`POST /v1/snaps` and `POST /v1/snaps/batches` accept an `idempotency_key`. If a request times out, send the same request again with the same key. The instance then returns the first result and does not render again.

- A key has a maximum of 191 characters.
- A key accepts letters, digits, underscores and hyphens only.
- The instance keeps a key for 24 hours. After that, the same key starts a new render.
- A key belongs to your company.
- A replayed response carries the header `X-Idempotent-Replay: true`.
- If another request with the same key is still in progress, the response is `409` with the code `idempotency_key_in_progress`. Nothing is created. Send the request again after a short wait.
- A key that a single snap used returns `409` on the batch endpoint. A key that a batch used returns `409` on `POST /v1/snaps`.
- `POST /v1/snaps` with `collection_id` does not accept a key.

The scheduler removes old keys every hour with `php artisan snaps:prune-idempotency-keys`. See [Scheduler](../self-hosting/scheduler.md).

## Webhooks

An async snap and a batch can post a webhook when they finish.

The `webhook_url` must be a public `http` or `https` address. If the host resolves to a private, loopback, link-local or reserved address, the request gets `422`.

The instance posts JSON with `Http::post()`. It tries three times, with a short wait between the attempts. If all three attempts fail, the instance writes a warning to its log. The webhook request carries no signature.

TODO(owner): Do you want to sign webhook requests, so that a receiver can prove that the request came from the instance?

**Snap webhook.** The instance posts it after an async snap completes. A failed snap posts no webhook.

```json
{
  "event": "snap.completed",
  "snap": {
    "id": "9f1c2d3e",
    "media_url": "https://snapsbrew.example/storage/snaps/9f1c2d3e.png",
    "type": "image",
    "status": "completed",
    "is_async": true,
    "webhook_url": "https://example.com/hooks/snap",
    "completed_at": "2026-05-01T12:00:03Z",
    "last_error": null,
    "variants": [],
    "template_id": "141e8454-8aa1-420a-bd0b-18a85ba949a2",
    "template_title": "Launch card",
    "created_at": "2026-05-01T12:00:00Z"
  }
}
```

**Batch webhook.** The instance posts one webhook when a batch reaches a terminal status. The `event` is `snap-import.completed`, `snap-import.failed` or `snap-import.canceled`.

```json
{
  "event": "snap-import.completed",
  "import": {
    "uuid": "7c1f2a9e-0b44-4a1e-9f2b-5d3c8e1a7b60",
    "title": "October launch",
    "status": "completed",
    "total_rows": 2,
    "processed_rows": 2,
    "completed": 2,
    "pending": 0,
    "failed": 0,
    "canceled": 0
  },
  "template": {
    "uuid": "141e8454-8aa1-420a-bd0b-18a85ba949a2",
    "title": "Launch card"
  }
}
```

## Public addresses for images

An `image_url` in `variants` must also be a public `http` or `https` address. The scheme, host and port of `APP_URL` are always accepted. Another port on the host of `APP_URL` gets the same check as any other host. The same rule applies to the `url` of a screenshot.

## Code examples

The examples use `curl` and PHP. The PHP examples use the Laravel `Http` client. Each PHP example reads the token from your own configuration:

```php
use Illuminate\Support\Facades\Http;

$token = config('services.snapsbrew.token');
$base = 'https://snapsbrew.example/api';
```

`services.snapsbrew.token` is a key in your own app, not in Snapsbrew. Put the token in your secret store.
