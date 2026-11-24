---
title: SDKs
description: Install and use the Snapsbrew client libraries for JavaScript and TypeScript, PHP, Python and Ruby.
order: 1
---

# SDKs

Four client libraries call the [REST API](../api/overview.md) of an instance. They also sign [signed URLs](../api/signed-urls.md) and verify [webhooks](../api/overview.md#verify-the-signature). Each library needs the URL of your instance, because each instance serves its own API.

This page describes version 0.2.0 of each library, on the `main` branch of its repository.

| Language | Repository | Package name | Runtime |
|---|---|---|---|
| JavaScript and TypeScript | `amedina068/snapsbrew-js` | `snapsbrew` | Node.js 20 or later, Bun 1.x, Deno 2.x, Cloudflare Workers |
| PHP | `amedina068/snapsbrew-php` | `snapsbrew/snapsbrew-php` | PHP 8.2, 8.3 and 8.4. Laravel 11, 12 and 13 are optional. |
| Python | `amedina068/snapsbrew-python` | `snapsbrew` | Python 3.10, 3.11, 3.12, 3.13 and 3.14 |
| Ruby | `amedina068/snapsbrew-ruby` | `snapsbrew` | Ruby 3.2, 3.3 and 3.4. Rails 7.2, 8.0 and 8.1 are optional. |

The packages are not on npm, Packagist, PyPI or RubyGems yet. Version 0.2.0 has no release and no version tag. Install each package from its git repository. The repositories are private on GitHub, so you need read access to the repository of your language.

| Language | Install from git |
|---|---|
| JavaScript and TypeScript | `npm install github:amedina068/snapsbrew-js` |
| PHP | Add the VCS repository `https://github.com/amedina068/snapsbrew-php`, then run `composer require snapsbrew/snapsbrew-php:dev-main` |
| Python | `pip install "git+https://github.com/amedina068/snapsbrew-python.git"` |
| Ruby | `gem "snapsbrew", github: "amedina068/snapsbrew-ruby"` in the Gemfile, then `bundle install` |

Each library is available under the MIT License. The Snapsbrew app has its own license.

TODO(owner): When do you release the packages to the registries? The names are `snapsbrew` on npm, `snapsbrew/snapsbrew-php` on Packagist, `snapsbrew` on PyPI and `snapsbrew` on RubyGems. After the release, the install commands on this page change to `npm install snapsbrew`, `composer require snapsbrew/snapsbrew-php`, `pip install snapsbrew` and `gem "snapsbrew"`. Then the readers no longer need access to the repositories.

## What the libraries share

- **Instance URL.** Each library takes the root URL of the instance, for example `https://snapsbrew.example`, and adds `/api`. No library has a default URL.
- **Token.** Each library sends the API token as a bearer token. The token must have the `api_requests` ability. See [Create an API token](../api/overview.md#create-an-api-token).
- **Resources.** Each library covers the account, templates, editor documents, snaps, batches, screenshots, media, tags, guides and embedded forms. See [Embedded forms](#embedded-forms).
- **Signed URLs.** Each library signs a URL with a signed-URL key, not with the API token. The four libraries make the same signature for the same parameters, and each one passes the shared test vectors. See [Get a signed-URL key](../using-snapsbrew/signed-urls.md#get-a-signed-url-key).
- **Webhooks.** Each library has one verifier for the webhooks of an async snap and of a batch. See [Webhook verification](#webhook-verification).
- **Errors.** Each library has one error class for each status: `401`, `403`, `404`, `409`, `422`, `429` and `5xx`. The error carries the `code` of the body and the request ID. See [Errors](#errors).
- **Retries.** Each library retries a failed request two times by default, with the same rules. See [Retries](#retries).
- **Timeout.** The default timeout of one attempt is 60 seconds in each library, because a synchronous render can take that long.
- **No telemetry.** No library sends data to a party other than your instance.

WARNING: Keep the API token, the signed-URL key and the webhook signing secret on your server. Do not put them in browser code or in a mobile app. A person with the signed-URL key can render images on your account.

### Webhook verification

An async snap and a batch post a webhook to their webhook URL. The instance signs each webhook with the webhook signing secret of your company. **Account > Developers** shows the secret and rotates it. A secret starts with `whsec_`.

Each verifier works the same way:

- It reads three headers: `X-Snapsbrew-Signature`, `X-Snapsbrew-Timestamp` and `X-Snapsbrew-Delivery`. The header names are not case-sensitive.
- It computes the HMAC-SHA256 of `{X-Snapsbrew-Timestamp}.{raw body}` with the secret. It changes `X-Snapsbrew-Signature` to lowercase, then compares the two values in constant time.
- It refuses a timestamp that is more than 300 seconds before or after the current time. A `tolerance` setting changes this limit.
- It returns the decoded body, the timestamp and the delivery ID. The delivery ID is the value of `X-Snapsbrew-Delivery`. All attempts of one delivery have the same ID.
- If `X-Snapsbrew-Delivery` is missing, the verification passes and the delivery ID is null (`null`, `None` or `nil`). Older instances do not send this header.
- It accepts an event type that it does not know. A new instance version can add an event.

To receive a webhook:

1. Read the raw request body, byte for byte.
2. Give the raw body, the headers and the secret to the verifier.
3. If the verifier raises its error, answer with `400`.
4. If the delivery ID is not null and you know it already, answer with `200` and do nothing.
5. Store the delivery ID, then do the work of the event.

Do not decode the JSON and encode it again before you verify it. The instance escapes `/` and non-ASCII characters (`\/`, `¿`). A new encoding gives other bytes, and the signature check fails.

The events are `snap.completed`, `snap.failed`, `snap-import.completed`, `snap-import.failed` and `snap-import.canceled`. A `snap.failed` body has a snap with `status` `failed`, `last_error` `render_failed` and an empty `media_url`. Each library gives `media_url` as an empty string. A `snap-import.*` body has `import`, with the counts of the batch, and `template`, with its `uuid` and `title`.

The error of the verifier has a `reason`. The four libraries use the same three reasons, in the style of each language:

| Reason | Cause | JavaScript | PHP | Python | Ruby |
|---|---|---|---|---|---|
| signature | The signature header is missing, or the signature does not match the body. | `"signature"` | `VerificationFailure::Signature` | `"signature"` | `:signature` |
| timestamp | The timestamp header is missing, is not Unix seconds, or is outside the tolerance. | `"timestamp"` | `VerificationFailure::Timestamp` | `"timestamp"` | `:timestamp` |
| payload | The signature is valid, but the body is not a JSON object. | `"payload"` | `VerificationFailure::Payload` | `"payload"` | `:payload` |

The delivery ID is `deliveryId` in JavaScript and PHP, and `delivery_id` in Python and Ruby.

### Embedded forms

Each library sends the values of an [embedded form](../api/embedded-forms.md) to its signed submit URL with `forms.submit(url, layers)`. The form renders on the account of its owner, so the library sends no API token to the submit URL.

| Language | Call | Image value |
|---|---|---|
| JavaScript | `await sb.forms.submit(submitUrl, { headline: "Hello", photo: file })` | A `Blob` or a `File` |
| PHP | `$snapsbrew->forms()->submit($submitUrl, ['headline' => 'Hello', 'photo' => $file])` | A resource or an `SplFileInfo` |
| Python | `client.forms.submit(submit_url, {"headline": "Hello", "photo": Path("photo.png")})` | A path, bytes or a binary file object |
| Ruby | `Snapsbrew.forms.submit(submit_url, headline: "Hello", photo: params[:photo])` | A File, a `Pathname` or an uploaded file |

- A text value is a string.
- A template form returns one snap. A collection form returns a list of snaps, and its layer keys are `{template uuid}__{layer key}`.
- If the signature is not valid, or the form does not exist, the call raises the not-found error.
- If one IP address or one form sends too many submits in one minute, the call raises the rate-limit error with the code `rate_limited`. The library retries it.
- No library retries a submit after a `5xx`, because each submit renders a snap.

### Errors

| Status | JavaScript | PHP | Python | Ruby |
|---|---|---|---|---|
| `400` | `ApiError` | `ApiException` | `BadRequestError` | `Snapsbrew::ApiError` |
| `401` | `AuthenticationError` | `AuthenticationException` | `AuthenticationError` | `Snapsbrew::AuthenticationError` |
| `403` | `AuthorizationError` | `AuthorizationException` | `AuthorizationError` | `Snapsbrew::AuthorizationError` |
| `404` | `NotFoundError` | `NotFoundException` | `NotFoundError` | `Snapsbrew::NotFoundError` |
| `409` | `ConflictError` | `ConflictException` | `ConflictError` | `Snapsbrew::ConflictError` |
| `422` | `ValidationError` | `ValidationException` | `ValidationError` | `Snapsbrew::ValidationError` |
| `429` | `RateLimitError` | `RateLimitException` | `RateLimitError` | `Snapsbrew::RateLimitError` |
| `5xx` | `ServerError` | `ServerException` | `ServerError` | `Snapsbrew::ServerError` |
| No response | `ConnectionError`, `TimeoutError` | `ConnectionException` | `APIConnectionError`, `APITimeoutError` | `Snapsbrew::ConnectionError` |
| Webhook not valid | `WebhookVerificationError` | `WebhookVerificationException` | `WebhookVerificationError` | `Snapsbrew::WebhookVerificationError` |

The PHP exceptions are in the `Snapsbrew\Exceptions` namespace.

These rules are the same in each library:

- A token without the `api_requests` ability gets `403` on each call, with the message `Invalid ability provided.`
- The message of a `404` can change, for example `No query results for model [...]`. Do not compare the text. Use the error class and the code.
- If `guides.platform` or `guides.purpose` gets a key that does not exist, the not-found error has `available`, the list of the valid keys.
- A `422` from an editor document operation has a `code` and no field errors, for example `editor_operation_layer_not_found`.
- If a render fails on the server, `POST /v1/snaps` and `POST /v1/snaps/batches` return `500` with the code `internal_error`. The message does not show the cause.
- The request ID is the value of the `X-Request-Uuid` header. Give it to the person who runs the instance. See [Request IDs](../api/overview.md#request-ids).

A `409` has one of the codes in [Conflict codes](../api/overview.md#conflict-codes). For each `409`, the instance saved nothing.

| Code | What to do |
|---|---|
| `idempotency_key_in_progress` | Nothing. The library sends the request again with the same key. |
| `idempotency_key_belongs_to_snap` | Send a new key to the batch endpoint. |
| `idempotency_key_belongs_to_batch` | Send a new key to the snap endpoint. |
| `editor_document_conflict` | Apply your change to the current document. Send it with the current revision. |
| `legacy_edit_rejected_for_v2` | Change the template through its editor document. |

### Retries

| Failure | `GET`, and a request that is safe to repeat | A request that is not safe to repeat |
|---|---|---|
| `429` | Retry | Retry |
| `409` with `idempotency_key_in_progress` | Retry, when the request has an idempotency key | No retry |
| Another `409` | No retry | No retry |
| `5xx` | Retry | No retry |
| A connection that did not open (DNS error, refused connection) | Retry | Retry |
| A timeout, or a connection that closed after the request left | Retry | No retry |

- The wait starts at 0.5 seconds and doubles on each attempt, to a maximum of 8 seconds. Half of each wait is random (jitter).
- If the response has a `Retry-After` header, the library waits for that time.
- If `Retry-After` is more than 60 seconds, the library does not wait. It raises the error at once.
These calls are safe to repeat in each library:

- Each `GET` and `DELETE`, for example a template delete. After a lost response, a repeated template delete gets a `404`, because the first request deleted the template.
- A template publish, a change to the tags of a template, and a batch cancel.
- A `POST /v1/snaps` or `POST /v1/snaps/batches` with an idempotency key. See [Idempotency keys](../api/overview.md#idempotency-keys).

The other calls are not safe to repeat: a template create or update, a snap or a batch with no idempotency key, a screenshot, a media upload, a tag create and a form submit. A write to an editor document (replace or apply) is not safe to repeat, because a repeat after a lost response gets a conflict. No library retries these calls after a `5xx` or a timeout.

The [rate limits](../api/overview.md#rate-limits) are 60 requests in one minute for one user. A preview also has a limit of 10 in one minute. The editor document endpoints also have a limit of 30 for one user and 180 for one company.

## JavaScript and TypeScript

The package runs on Node.js, Bun, Deno and Cloudflare Workers. It has no runtime dependencies. It uses the global `fetch` and Web Crypto. It ships ESM and CommonJS, with types for both.

### Install

```bash
npm install github:amedina068/snapsbrew-js
```

For Bun, run `bun add github:amedina068/snapsbrew-js`. Your git client must have access to the private repository, for example through an SSH key or `gh auth login`.

The `prepare` script of the package builds the package during the install. The build tools need Node.js 22.18 or later. The built package runs on Node.js 20.

### Requirements

| Runtime | Version | Test in CI |
|---|---|---|
| Node.js | 20, 22, 24 and later | Unit tests and smoke test |
| Bun | 1.x | Smoke test |
| Deno | 2.x | Smoke test |
| Cloudflare Workers | Current | None. The package uses only Web APIs that Workers supply. |

### Quick start

```ts
import { Snapsbrew } from "snapsbrew";

const sb = new Snapsbrew({
	baseUrl: "https://snapsbrew.example",
	token: process.env.SNAPSBREW_TOKEN,
});

// A preview returns watermarked HTML and stores nothing.
const html = await sb.snaps.preview({
	templateId: "141e8454-8aa1-420a-bd0b-18a85ba949a2",
	variants: [{ layer: "title", text: "Hello" }],
});

// A snap returns the URL of the final image.
const snap = await sb.snaps.create({
	templateId: "141e8454-8aa1-420a-bd0b-18a85ba949a2",
	variants: [{ layer: "title", text: "Hello" }],
});

console.log(snap.media_url);
```

The request parameters use camelCase, for example `templateId`. The response fields keep the names of the API, for example `media_url`.

The resources are `sb.account`, `sb.templates`, `sb.documents`, `sb.snaps`, `sb.batches`, `sb.screenshots`, `sb.media`, `sb.tags`, `sb.guides` and `sb.forms`.

### Configuration

| Setting | Default | Description |
|---|---|---|
| `baseUrl` | (required) | The root URL of your instance. |
| `token` | (required) | The API token. |
| `timeout` | `60000` | The time limit for one attempt, in milliseconds. |
| `maxRetries` | `2` | The number of retries after the first attempt. `0` stops retries. |
| `fetch` | the global `fetch` | A `fetch` function for a proxy, for logs or for tests. |

Each method also accepts `{ signal, timeout, maxRetries }` as its last argument. These values replace the client values for that call. An abort of the `signal` also stops a retry wait.

### Pagination

`sb.templates.list()` and `sb.screenshots.list()` use a cursor. `sb.media.list()` uses a page number. Each list method returns a `PagePromise`:

- Use `await` to get one page with its raw body.
- Use `for await` to get each item of each page. The library loads the next page only when the loop needs it.
- Use `.pages()` to get each page.
- Use `.toArray()` to get all items in one array.

```ts
const firstPage = await sb.templates.list();
console.log(firstPage.meta.next_cursor);

for await (const template of sb.templates.list()) {
	console.log(template.uuid, template.title);
}
```

### Errors

Each error extends `SnapsbrewError` and has a `code`:

| Class | `code` | Cause |
|---|---|---|
| `AuthenticationError` | `authentication_error` | `401` |
| `AuthorizationError` | `authorization_error` | `403` |
| `NotFoundError` | `not_found` | `404`. Read `available` for a guide key. |
| `ConflictError` | `conflict` | `409`. Read `apiCode`, `currentRevision` and `currentDocument`. |
| `ValidationError` | `validation_error` | `422`. Read `errors`. |
| `RateLimitError` | `rate_limit` | `429`. Read `retryAfter` and `limit`. |
| `ServerError` | `server_error` | `5xx` |
| `ApiError` | `api_error` | Another error status. It is the parent of the HTTP classes above. |
| `ConnectionError` | `connection_error` | The request got no response. |
| `TimeoutError` | `timeout` | One attempt took more time than `timeout`. |
| `WebhookVerificationError` | `webhook_verification_error` | `verifyWebhook()` refused a webhook. Read `reason`. |

Each `ApiError` has `status`, `body`, `headers`, `requestId` and `apiCode`. `apiCode` is the `code` field of the body. Use `instanceof`, or use `isSnapsbrewError()` and a `switch` on `code`.

If you abort a call with your own `AbortSignal`, the library throws the reason of the signal. It does not wrap it.

### Retries

Set `maxRetries` to `0` to stop retries. Send `idempotencyKey` to make a render safe to repeat:

```ts
await sb.snaps.create({
	templateId,
	variants,
	idempotencyKey: `order-${order.id}`,
});
```

The library treats each `GET`, `PUT` and `DELETE` as safe to repeat, except `sb.documents.replace()`. It also treats `templates.publish()`, `templates.setTags()` and `batches.cancel()` as safe to repeat.

### Signed URLs

```ts
import { signedUrl } from "snapsbrew";

const url = await signedUrl({
	baseUrl: "https://snapsbrew.example",
	key: process.env.SNAPSBREW_SIGNING_KEY,
	templateId: "141e8454-8aa1-420a-bd0b-18a85ba949a2",
	variants: [{ layer: "title", text: "Hello" }],
	format: "webp",
});
```

`format` is `png` (the default), `jpeg` or `webp`. The `params` setting adds more query parameters to the signature. `signedUrl()` refuses the reserved names `identifier` and `api_log_uuid`. It also refuses the names that its other settings set.

### Webhooks

```ts
import { verifyWebhook } from "snapsbrew";

const { deliveryId, timestamp, payload } = await verifyWebhook({
	body: rawBody,
	headers: request.headers,
	secret: process.env.SNAPSBREW_WEBHOOK_SECRET,
});

switch (payload.event) {
	case "snap.completed":
		console.log(payload.snap.media_url);
		break;
	case "snap.failed":
		console.log(payload.snap.id, payload.snap.last_error);
		break;
	default:
		break;
}
```

| Setting | Default | Description |
|---|---|---|
| `body` | (required) | The raw body: a string, a `Uint8Array`, an `ArrayBuffer` or a `Buffer`. |
| `headers` | (required) | A `Headers` object or a plain object. |
| `secret` | (required) | The webhook signing secret, with its `whsec_` prefix. |
| `tolerance` | `300` | The maximum distance of the timestamp from now, in seconds. |
| `now` | `new Date()` | The current time. Use it in tests. |

The result has `deliveryId`, `timestamp` and `payload`. `deliveryId` is `null` when the delivery header is missing. A `switch (payload.event)` narrows the type of `payload`.

This example receives webhooks in an Express app. Use `express.raw()` on the webhook route, because `express.json()` loses the raw bytes:

```ts
import express from "express";
import { verifyWebhook, WebhookVerificationError } from "snapsbrew";

const app = express();

app.post(
	"/webhooks/snapsbrew",
	express.raw({ type: "application/json" }),
	async (req, res) => {
		try {
			const { deliveryId, payload } = await verifyWebhook({
				body: req.body,
				headers: req.headers,
				secret: process.env.SNAPSBREW_WEBHOOK_SECRET!,
			});

			await handleOnce(deliveryId, payload);
			res.sendStatus(200);
		} catch (error) {
			if (error instanceof WebhookVerificationError) {
				res.status(400).send(error.message);
				return;
			}
			throw error;
		}
	},
);
```

In Next.js, Hono or Cloudflare Workers, read the raw body with `await request.text()`. Then give `request.headers` as the headers.

### Editor documents

`sb.documents` has `get()`, `replace()`, `apply()` and `preflight()`. Each write sends the `revision` of your last read. See [Editor documents](../api/editor-documents.md).

```ts
import { ConflictError } from "snapsbrew";

const current = await sb.documents.get(uuid);

try {
	await sb.documents.apply(uuid, {
		revision: current.revision,
		operations: [
			{
				operation: "set_layer_property",
				layer_key: "title",
				property: "fontWeight",
				value: 700,
			},
		],
	});
} catch (error) {
	if (
		error instanceof ConflictError &&
		error.apiCode === "editor_document_conflict"
	) {
		// Apply your change to error.currentDocument.
		// Then send it with error.currentRevision.
	}
}
```

## PHP

The package works with each PSR-18 HTTP client. Guzzle is the default. The package also has a Laravel integration: a service provider, a facade, `Snapsbrew::fake()`, a shared webhook verifier and a Blade component.

### Install

Add the repository to the `composer.json` file of your project:

```json
{
    "repositories": [
        { "type": "vcs", "url": "https://github.com/amedina068/snapsbrew-php" }
    ]
}
```

Then install the `main` branch:

```bash
composer require snapsbrew/snapsbrew-php:dev-main
```

The repository has no version tag. Without `:dev-main`, Composer looks for a stable version and finds none. If Composer cannot read the private repository, give Composer a GitHub token:

```bash
composer config --global github-oauth.github.com <your-token>
```

If your project has no PSR-18 HTTP client, also install Guzzle:

```bash
composer require guzzlehttp/guzzle
```

### Requirements

| Runtime | Versions |
|---|---|
| PHP | 8.2, 8.3 and 8.4 |
| Laravel (optional) | 11, 12 and 13. Laravel 13 needs PHP 8.3 or later. |

### Quick start

```php
use Snapsbrew\Snapsbrew;
use Snapsbrew\Variants;

$snapsbrew = new Snapsbrew(
    url: 'https://snapsbrew.example',
    token: getenv('SNAPSBREW_TOKEN'),
);

$snap = $snapsbrew->snaps()->create($templateId, Variants::make()
    ->text('title', 'Hello')
    ->image('cover', 'https://example.com/cover.jpg'));

echo $snap->mediaUrl;
```

The resources are `account()`, `templates()`, `documents()`, `snaps()`, `batches()`, `screenshots()`, `media()`, `tags()`, `guides()` and `forms()`.

### Configuration

| Argument | Default | Description |
|---|---|---|
| `url` | (required) | The URL of your instance. The library removes a trailing `/api`. |
| `token` | `null` | The API token. The API calls need it. |
| `signingKey` | `null` | The signed-URL key. Signed URLs need it. |
| `timeout` | `60.0` | The request timeout, in seconds. |
| `retries` | `2` | The number of retries, or a `Snapsbrew\Http\RetryPolicy`. |
| `httpClient` | Guzzle, or discovery | A PSR-18 client. |
| `requestFactory`, `streamFactory` | discovery | PSR-17 factories. |

The library applies `timeout` only when it creates the Guzzle client. If you give your own `httpClient`, set the timeout on that client.

In Laravel, set these variables in the `.env` file of your app:

```dotenv
SNAPSBREW_URL=https://snapsbrew.example
SNAPSBREW_TOKEN=<your-token>
SNAPSBREW_SIGNING_KEY=<your-signing-key>
SNAPSBREW_WEBHOOK_SECRET=<your-webhook-secret>
```

`SNAPSBREW_TIMEOUT` (default `60`), `SNAPSBREW_RETRIES` (default `2`) and `SNAPSBREW_WEBHOOK_TOLERANCE` (default `300`) are optional.

### Pagination

`templates()->list($cursor)` and `screenshots()->list($cursor)` return a `CursorPage` with `items`, `nextCursor` and `hasMore()`. `templates()->all()` and `screenshots()->all()` return a generator that reads each page.

`media()->list($page)` returns a `Page` with `items`, `currentPage`, `lastPage`, `total` and `nextPage()`.

```php
foreach ($snapsbrew->templates()->all() as $template) {
    echo $template->uuid.' '.$template->title."\n";
}
```

### Errors

Each exception extends `Snapsbrew\Exceptions\SnapsbrewException`:

| Exception | Cause |
|---|---|
| `AuthenticationException` | `401` |
| `AuthorizationException` | `403` |
| `NotFoundException` | `404`. `available()` gives the valid keys of a guide. |
| `ConflictException` | `409`. `errorCode()`, `currentRevision()` and `currentDocument()` give the details. |
| `ValidationException` | `422`. `errors()` gives the messages for each field. `errorCode()` gives the code of an editor operation. |
| `RateLimitException` | `429`. `retryAfter()`, `limit()` and `remaining()` give the headers. |
| `ServerException` | `5xx` |
| `ApiException` | Another `4xx` status. It is the parent of the HTTP exceptions above. |
| `ConnectionException` | The request got no response. |
| `UnexpectedResponseException` | The body does not have the expected shape. |
| `MissingCredentialsException` | The client has no URL, token or signing key for the call, or the webhook secret is empty. |
| `WebhookVerificationException` | A webhook is not valid. Read `reason`. |

`requestUuid()` gives the request ID.

### Retries

To stop retries, pass `retries: 0`. To change the waits, pass a `RetryPolicy`:

```php
use Snapsbrew\Http\RetryPolicy;

new Snapsbrew(url: $url, token: $token, retries: new RetryPolicy(
    retries: 4,
    baseDelayMs: 250,
    maxDelayMs: 5_000,
    maxRetryAfter: 30,
));
```

The library treats each `GET`, `PUT` and `DELETE` as safe to repeat, except `documents()->replace()`. It also treats `templates()->publish()`, `templates()->setTags()` and `batches()->cancel()` as safe to repeat.

### Signed URLs

```php
$snapsbrew = new Snapsbrew(url: 'https://snapsbrew.example', signingKey: getenv('SNAPSBREW_SIGNING_KEY'));

$url = $snapsbrew->signedUrl($templateId)
    ->text('title', 'Hello')
    ->format('png')
    ->url();
```

The formats are `png`, `jpeg` and `webp`. Call `transparent()` for a transparent background with `png` or `webp`. The builder never adds the reserved parameters `identifier` and `api_log_uuid`.

In a Blade view, the `<x-snapsbrew::image>` component signs the URL on the server and writes the `<img>` tag.

### Webhooks

```php
use Snapsbrew\Exceptions\WebhookVerificationException;
use Snapsbrew\Webhooks\Webhook;
use Snapsbrew\Webhooks\WebhookEvent;

$webhook = new Webhook(getenv('SNAPSBREW_WEBHOOK_SECRET'), tolerance: 300);

try {
    $event = $webhook->verify(file_get_contents('php://input'), getallheaders());
} catch (WebhookVerificationException $exception) {
    http_response_code(400);
    exit;
}

if ($event->is(WebhookEvent::SNAP_COMPLETED)) {
    $imageUrl = $event->snap()->mediaUrl;
}
```

`verify()` returns a `WebhookEvent` with these fields:

- `type`: the event type, for example `snap.completed`.
- `payload`: the decoded body.
- `timestamp`: the value of `X-Snapsbrew-Timestamp`, in Unix seconds.
- `deliveryId`: the value of `X-Snapsbrew-Delivery`, or `null`.
- `snap()`, `batch()` and `template()`: the objects of the body, or `null`.

The event constants are `WebhookEvent::SNAP_COMPLETED`, `WebhookEvent::SNAP_FAILED`, `WebhookEvent::BATCH_COMPLETED`, `WebhookEvent::BATCH_FAILED` and `WebhookEvent::BATCH_CANCELED`. The `reason` of a `WebhookVerificationException` is a `Snapsbrew\Webhooks\VerificationFailure`. `Payload` means that the signature is correct, but the body is not a JSON object.

In Laravel, the container gives a `Webhook` with `SNAPSBREW_WEBHOOK_SECRET` and `SNAPSBREW_WEBHOOK_TOLERANCE`. Exclude the webhook route from CSRF protection:

```php
use Illuminate\Http\Request;
use Snapsbrew\Exceptions\WebhookVerificationException;
use Snapsbrew\Webhooks\Webhook;
use Snapsbrew\Webhooks\WebhookEvent;

Route::post('/webhooks/snapsbrew', function (Request $request, Webhook $webhook) {
    try {
        $event = $webhook->verify($request->getContent(), $request->headers->all());
    } catch (WebhookVerificationException) {
        abort(400);
    }

    if ($event->is(WebhookEvent::SNAP_FAILED)) {
        report("Snap {$event->snap()->id} failed: {$event->snap()->lastError}");
    }

    return response()->noContent();
});
```

### Editor documents

`documents()` has `find()`, `replace($uuid, $revision, $document)`, `apply($uuid, $revision, $operations)` and `preflight()`. See [Editor documents](../api/editor-documents.md).

```php
use Snapsbrew\Exceptions\ConflictException;

$document = $snapsbrew->documents()->find($uuid);

try {
    $document = $snapsbrew->documents()->apply($uuid, revision: $document->revision, operations: [
        ['operation' => 'set_layer_property', 'layer_key' => 'headline', 'property' => 'fontWeight', 'value' => 700],
    ]);
} catch (ConflictException $exception) {
    // Apply your change to $exception->currentDocument().
    // Then send it with $exception->currentRevision().
}

if (! $snapsbrew->documents()->preflight($uuid)->passes()) {
    // Correct the issues before you publish the template.
}
```

## Python

The package has one dependency, `httpx`. It has a sync client, `Snapsbrew`, and an async client, `AsyncSnapsbrew`, with the same methods.

### Install

```bash
pip install "git+https://github.com/amedina068/snapsbrew-python.git"
```

With uv, run `uv add "git+https://github.com/amedina068/snapsbrew-python.git"`. Git must have access to the private repository, for example with an SSH key or with `gh auth setup-git`. To install a fixed commit, add `@<commit>` to the URL.

### Requirements

Python 3.10, 3.11, 3.12, 3.13 and 3.14. The CI runs the tests, the lint and the type check on each version. The package has full type hints and a `py.typed` file.

### Quick start

```python
from snapsbrew import Snapsbrew, Text, Image

with Snapsbrew(base_url="https://snapsbrew.example", token="<your-token>") as client:
    html = client.snaps.preview(template_id, variants=[Text("title", "Hello")])

    snap = client.snaps.create(
        template_id,
        variants=[Text("title", "Hello"), Image("cover", "https://example.com/cover.jpg")],
    )
    print(snap.media_url)
```

The resources are `client.templates`, `client.documents`, `client.snaps`, `client.batches`, `client.screenshots`, `client.media`, `client.tags`, `client.guides` and `client.forms`. `client.account()` reads the account.

### Configuration

| Setting | Default | Description |
|---|---|---|
| `base_url` | `$SNAPSBREW_URL` | The URL of your instance. The client removes a trailing `/` and a trailing `/api`. |
| `token` | `$SNAPSBREW_TOKEN` | The API token. |
| `timeout` | `60.0` | The timeout of each request, in seconds, or an `httpx.Timeout`. |
| `max_retries` | `2` | The number of retries. `0` stops retries. |
| `http_client` | a new `httpx.Client` | Your own `httpx.Client`, for a proxy or custom headers. |

Use the client as a context manager, or call `client.close()`. Close an async client with `await client.aclose()`, or use `async with`. The client does not close an `httpx.Client` that you give.

### Pagination

`client.templates.list(cursor=...)` and `client.screenshots.list(cursor=...)` return a `Page` with `data`, `next_cursor` and `has_more`. `client.templates.iter()` and `client.screenshots.iter()` read each page.

`client.media.list(page=1)` returns a `MediaPage` with `data`, `current_page`, `last_page` and `total`.

```python
for template in client.templates.iter():
    print(template.uuid, template.title)
```

### Errors

Each error extends `SnapsbrewError`:

| Class | Cause |
|---|---|
| `APIConnectionError` | The request got no response. |
| `APITimeoutError` | The request took more time than the timeout. It is a subclass of `APIConnectionError`. |
| `BadRequestError` | `400` |
| `AuthenticationError` | `401` |
| `AuthorizationError` | `403` |
| `NotFoundError` | `404`. `available` has the valid keys of a guide. |
| `ConflictError` | `409`. Read `code`, `retryable`, `current_revision` and `current_document`. |
| `ValidationError` | `422`. `errors` has the field errors, and `code` has the code of a rule. |
| `RateLimitError` | `429`. Read `retry_after`, `limit` and `remaining`. |
| `ServerError` | `5xx` |
| `WaitTimeoutError` | `batches.wait()` did not see a terminal status in time. |
| `WebhookVerificationError` | A webhook is not valid. Read `reason`. |

Each `APIError` has `status_code`, `message`, `body`, `code`, `request_id` and `response`. An argument that breaks a rule before the request, for example an empty template ID, raises `ValueError` or `TypeError`.

### Retries

Set `max_retries=0` to stop retries. Give an `idempotency_key` to make a render safe to repeat:

```python
snap = client.snaps.create(template_id, variants, idempotency_key="order-1042-card")
```

The client treats each `GET` and `DELETE` as safe to repeat, for example `templates.delete()`. It also treats `templates.publish()`, `templates.set_tags()` and `batches.cancel()` as safe to repeat.

### Signed URLs

```python
import os
from snapsbrew import signed_url, Text

url = signed_url(
    base_url="https://snapsbrew.example",
    key=os.environ["SNAPSBREW_SIGNING_KEY"],
    template_id="141e8454-8aa1-420a-bd0b-18a85ba949a2",
    variants=[Text("title", "Hello")],
    format="webp",
)
```

`format` is `"png"` (the default), `"jpeg"` or `"webp"`. `transparent=True` works with PNG and WebP only. `params` adds more query parameters to the signature. The builder refuses the reserved names `identifier` and `api_log_uuid`.

### Webhooks

```python
from snapsbrew import WebhookVerificationError, verify_webhook

try:
    event = verify_webhook(raw_body, headers, secret, tolerance=300)
except WebhookVerificationError as error:
    print(error.reason)
    raise

if event.type == "snap.completed":
    print(event.snap.media_url)
```

`verify_webhook()` returns a `WebhookEvent` with these fields:

- `type`: the `event` field of the body.
- `delivery_id`: the value of `X-Snapsbrew-Delivery`, or `None`.
- `timestamp`: the value of `X-Snapsbrew-Timestamp`, in Unix seconds.
- `data`: the decoded body.
- `snap`: a `Snap` for a `snap.*` event, else `None`.
- `batch`: a `Batch` with the counts for a `snap-import.*` event, else `None`.

The `now` argument sets the current Unix time in a test. `snapsbrew.webhooks.sign()` makes a signature for the tests of your own receiver.

This example receives webhooks in Django. The instance sends no CSRF token, so the view must be `csrf_exempt`:

```python
from django.conf import settings
from django.http import HttpRequest, HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from snapsbrew import WebhookVerificationError, verify_webhook


@csrf_exempt
@require_POST
def snapsbrew_webhook(request: HttpRequest) -> HttpResponse:
    try:
        event = verify_webhook(request.body, request.headers, settings.SNAPSBREW_WEBHOOK_SECRET)
    except WebhookVerificationError:
        return HttpResponseBadRequest()

    if event.type == "snap.completed" and not already_seen(event.delivery_id):
        save_image(event.snap.id, event.snap.media_url)
    return HttpResponse(status=204)
```

In FastAPI, read the raw body with `await request.body()`. The README of the package has a full FastAPI example.

### Editor documents

`client.documents` has `get()`, `replace()`, `apply()` and `preflight()`. See [Editor documents](../api/editor-documents.md).

```python
from snapsbrew import ConflictError

current = client.documents.get(template_id)
try:
    current = client.documents.apply(
        template_id,
        revision=current.revision,
        operations=[
            {"operation": "set_layer_property", "layer_key": "title", "property": "fontWeight", "value": 700},
        ],
    )
except ConflictError as error:
    # Apply your change to error.current_document.
    # Then send it with error.current_revision.
    print(error.current_revision)

preflight = client.documents.preflight(template_id)
for issue in preflight.issues:
    print(issue.code, issue.path, issue.message)
```

## Ruby

The gem uses the Ruby standard library only. It has a Railtie, a generator and view helpers for Rails.

### Install

Add the gem to your Gemfile:

```ruby
gem "snapsbrew", github: "amedina068/snapsbrew-ruby"
```

Then run `bundle install`. Bundler installs the gem from the `main` branch. Git must have access to the private repository, for example through `gh auth setup-git`.

### Requirements

- Ruby 3.2, 3.3 and 3.4
- Rails 7.2, 8.0 and 8.1 (optional)

### Quick start

```ruby
require "snapsbrew"

Snapsbrew.configure do |config|
  config.url   = "https://snapsbrew.example"
  config.token = ENV["SNAPSBREW_TOKEN"]
end

html = Snapsbrew.snaps.preview(template: template_id, variants: { title: "Hello" })
snap = Snapsbrew.snaps.create(template: template_id, variants: { title: "Hello" })
snap.media_url
```

The variants Hash maps a layer key to a value. A string becomes `text`, an `http` or `https` URL becomes `image_url`, and `false` or `nil` hides the layer.

The resources are `Snapsbrew.account`, `templates`, `documents`, `snaps`, `batches`, `screenshots`, `media`, `tags`, `guides` and `forms`. `templates.set_tags(id, tag_ids)` replaces the tags of a template, and `templates.preview(id, variants:)` returns a watermarked preview. To connect to more than one instance, make a client for each instance:

```ruby
client = Snapsbrew::Client.new(url: "https://snapsbrew.example", token: ENV["SNAPSBREW_TOKEN"])
client.templates.list
```

### Configuration

| Setting | Default | Description |
|---|---|---|
| `url` | `SNAPSBREW_URL` | The URL of your instance, with or without `/api`. |
| `token` | `SNAPSBREW_TOKEN` | The API token. |
| `signing_key` | `SNAPSBREW_SIGNING_KEY` | The signed-URL key. Only signed URLs need it. |
| `webhook_secret` | `SNAPSBREW_WEBHOOK_SECRET` | The webhook signing secret. Only `Snapsbrew::Webhook.verify` needs it. |
| `timeout` | `60` | The seconds to wait for a connection and for a response. |
| `max_retries` | `2` | The number of retries. `0` stops retries. |

If a setting is not configured, the gem reads the environment variable. In a Rails app, the gem also reads `Rails.application.credentials.snapsbrew`. A `Snapsbrew.configure` call in an initializer wins. `bin/rails generate snapsbrew:install` writes `config/initializers/snapsbrew.rb`.

### Pagination

`templates.list(cursor:)` and `screenshots.list(cursor:)` return a `Snapsbrew::Page`. `media.list(page:)` also returns a `Page`. A `Page` has `records`, `meta`, `next_page?` and `next_page`.

`templates.each`, `screenshots.each` and `media.each` read each page:

```ruby
page = Snapsbrew.templates.list
page = page.next_page if page.next_page?

Snapsbrew.templates.each { |template| puts template.title }
```

### Errors

Each error is a `Snapsbrew::Error`:

| Error | Cause |
|---|---|
| `Snapsbrew::ConfigurationError` | A setting is missing, for example `url`, `token` or `webhook_secret`. |
| `Snapsbrew::ConnectionError` | The connection failed or timed out. The original error is in `cause`. |
| `Snapsbrew::AuthenticationError` | `401` |
| `Snapsbrew::AuthorizationError` | `403` |
| `Snapsbrew::NotFoundError` | `404`. `available` gives the valid keys of a guide. |
| `Snapsbrew::ConflictError` | `409`. Read `code`, `current_revision` and `current_document`. |
| `Snapsbrew::ValidationError` | `422`. `errors` has the field errors. |
| `Snapsbrew::RateLimitError` | `429`. Read `retry_after` and `limit`. |
| `Snapsbrew::ServerError` | `5xx` |
| `Snapsbrew::ApiError` | Another status. It is the parent of the HTTP errors above. |
| `Snapsbrew::WebhookVerificationError` | A webhook is not valid. Read `reason`. |

Each `ApiError` has `status`, `body`, `message`, `code` and `request_id`.

### Retries

Set `max_retries` to `0` to stop retries. Give an `idempotency_key` to make a render safe to repeat:

```ruby
Snapsbrew.snaps.create(template: id, variants: { title: "Hello" }, idempotency_key: "order-1234")
```

The gem treats each `GET`, `PUT` and `DELETE` as safe to repeat, for example `templates.destroy`, except `documents.replace`. It also treats `templates.publish`, `templates.set_tags` and `batches.cancel` as safe to repeat.

### Signed URLs

```ruby
Snapsbrew.signed_url(template: template_id, title: "Hello", format: "webp")
```

The gem signs with `config.signing_key`. Each keyword other than `template`, `variants`, `format` and `transparent` is a layer. `transparent: true` with `jpeg` raises `ArgumentError`. The builder sends only `template_id`, `variants`, `format`, `transparent` and `signature`, so it never sends a reserved parameter.

In a Rails view, `snapsbrew_image_tag` and `snapsbrew_og_image_tag` sign the URL on the server.

### Webhooks

`Snapsbrew::Webhook.verify(body, headers, secret:, tolerance:, now:)` returns the decoded event. The default `secret` is `config.webhook_secret`, and the default `tolerance` is `300`. `headers` can be the Rails `request.headers`, a Rack env or a Hash.

The event is a `Snapsbrew::Record` with `delivery_id`. `delivery_id` is `nil` when the delivery header is missing. Read the body fields as methods, for example `event.event` and `event.snap`. `Snapsbrew::Webhook::EVENTS` lists the five events.

```ruby
class SnapsbrewWebhooksController < ActionController::API
  def create
    event = Snapsbrew::Webhook.verify(request.raw_post, request.headers)
    return head(:ok) if event.delivery_id && WebhookDelivery.exists?(delivery_id: event.delivery_id)

    case event.event
    when "snap.completed" then Cover.attach(event.snap.id, event.snap.media_url)
    when "snap.failed"    then Cover.fail(event.snap.id, event.snap.last_error)
    end

    WebhookDelivery.create!(delivery_id: event.delivery_id) if event.delivery_id
    head :ok
  rescue Snapsbrew::WebhookVerificationError
    head :bad_request
  end
end
```

`Snapsbrew::Webhook.sign(timestamp, body, secret)` makes a signature for the tests of your own controller.

### Editor documents

`Snapsbrew.documents` has `find`, `replace`, `apply` and `preflight`. See [Editor documents](../api/editor-documents.md).

```ruby
draft = Snapsbrew.documents.find(id)

begin
  Snapsbrew.documents.apply(id, revision: draft.revision, operations: [
    { operation: "set_layer_property", layer_key: "headline", property: "fontWeight", value: 700 }
  ])
rescue Snapsbrew::ConflictError => error
  # Apply your change to error.current_document.
  # Then send it with error.current_revision.
end

Snapsbrew.documents.preflight(id).issues
Snapsbrew.templates.publish(id)
```

A template with no draft has a `nil` document and the revision `0`.

### Embedded forms

`Snapsbrew.forms.submit` sends the values of an [embedded form](../api/embedded-forms.md) to its signed submit URL. The form renders on the account of its owner, so the call needs no token. The gem never sends the API token to the submit URL.

```ruby
snap = Snapsbrew.forms.submit(submit_url, headline: "Hello", photo: params[:photo])
snap.media_url

snaps = Snapsbrew.forms.submit(collection_submit_url, "141e8454-8aa1-420a-bd0b-18a85ba949a2__headline" => "Hello")
```

- Copy the `submit_signed_url` of the form from your instance. Do not change its query string.
- Give text as a String. Give an image as a File, a `Pathname` or an uploaded file.
- A template form uses the layer key. A collection form uses `{template uuid}__{layer key}` and returns an Array of snaps.
- If the signature is not valid, or the form does not exist, `submit` raises a `NotFoundError`.
- If one IP address or one form sends too many submits in one minute, `submit` raises a `RateLimitError` with the code `rate_limited`.

The other libraries have the same call. See [Embedded forms](#embedded-forms).
