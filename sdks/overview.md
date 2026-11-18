---
title: SDKs
description: Install and use the Snapsbrew client libraries for JavaScript and TypeScript, PHP, Python and Ruby.
order: 1
---

# SDKs

Four client libraries call the [REST API](../api/overview.md) of an instance and sign [signed URLs](../api/signed-urls.md). Each library needs the URL of your instance, because each instance serves its own API.

| Language | Repository | Package name | Runtime |
|---|---|---|---|
| JavaScript and TypeScript | `amedina068/snapsbrew-js` | `snapsbrew` | Node.js 20 or later, Bun 1.x, Deno 2.x, Cloudflare Workers |
| PHP | `amedina068/snapsbrew-php` | `snapsbrew/snapsbrew-php` | PHP 8.2, 8.3 and 8.4. Laravel 11, 12 and 13 are optional. |
| Python | `amedina068/snapsbrew-python` | `snapsbrew` | Python 3.10 to 3.14 |
| Ruby | `amedina068/snapsbrew-ruby` | `snapsbrew` | Ruby 3.2, 3.3 and 3.4. Rails 7.2, 8.0 and 8.1 are optional. |

The packages are not on npm, Packagist, PyPI or RubyGems yet. For now, install each package from its git repository. The repositories are private on GitHub, so you need read access to the repository of your language.

TODO(owner): When do you release the packages to the registries? The names are `snapsbrew` on npm, `snapsbrew/snapsbrew-php` on Packagist, `snapsbrew` on PyPI and `snapsbrew` on RubyGems. After the release, the install commands on this page change to `npm install snapsbrew`, `composer require snapsbrew/snapsbrew-php`, `pip install snapsbrew` and `gem "snapsbrew"`. Then the readers no longer need access to the repositories.

## What the libraries share

- Each library takes the root URL of the instance, for example `https://snapsbrew.example`, and adds `/api`.
- Each library sends the API token as a bearer token. The token must have the `api_requests` ability. See [Create an API token](../api/overview.md#create-an-api-token).
- Signed URLs need a signed-URL key, not the API token. See [Get a signed-URL key](../using-snapsbrew/signed-urls.md#get-a-signed-url-key).
- Each library has one error class for each status: `401`, `403`, `404`, `409`, `422`, `429` and `5xx`. The error carries the `code` of the body and a request ID. Give the request ID to the person who runs the instance.

WARNING: Keep the API token and the signed-URL key on your server. Do not put them in browser code or in a mobile app. A person with the key can render images on your account.

### Retries

The four libraries use the same retry rules. By default, each library retries a failed request two times.

| Failure | `GET`, and a write that is safe to repeat | `POST` with no idempotency key |
|---|---|---|
| `429` | Retry | Retry |
| `409` with `idempotency_key_in_progress` | Retry, when the request has an idempotency key | No retry |
| Another `409` | No retry | No retry |
| `5xx` | Retry | No retry |
| A connection that did not open (DNS error, refused connection) | Retry | Retry |
| A timeout, or a connection that closed after the request left | Retry | No retry |

- The wait starts at 0.5 seconds and doubles on each attempt, to a maximum of 8 seconds. A random part (jitter) is added.
- If the response has a `Retry-After` header, the library waits for that time.
- If `Retry-After` is more than 60 seconds, the library does not wait. It raises the rate limit error at once.
- A `POST /v1/snaps` or `POST /v1/snaps/batches` with an idempotency key is safe to repeat. See [Idempotency keys](../api/overview.md#idempotency-keys).
- `batches.cancel` is safe to repeat in each library. `templates.publish` is safe to repeat in the JavaScript, PHP and Ruby libraries.

## JavaScript and TypeScript

The package runs on Node.js, Bun, Deno and Cloudflare Workers. It has no runtime dependencies. It uses the global `fetch` and Web Crypto.

### Install

The repository does not hold the built files (`dist/`) and has no `prepare` script. Thus `npm install github:amedina068/snapsbrew-js` installs a package that has no code to import. Build the package, then install the archive:

```bash
git clone https://github.com/amedina068/snapsbrew-js.git
cd snapsbrew-js
npm install
npm run build
npm pack
```

`npm pack` writes `snapsbrew-0.1.0.tgz`. In your project, install that file:

```bash
npm install ../snapsbrew-js/snapsbrew-0.1.0.tgz
```

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

The options are `baseUrl`, `token`, `timeout` (60000 milliseconds), `maxRetries` (2) and `fetch`. Each method also accepts `{ signal, timeout, maxRetries }` as its last argument.

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

### Errors and retries

Each error extends `SnapsbrewError` and has a `code`:

| Class | `code` | Status |
|---|---|---|
| `AuthenticationError` | `authentication_error` | `401` |
| `AuthorizationError` | `authorization_error` | `403` |
| `NotFoundError` | `not_found` | `404` |
| `ConflictError` | `conflict` | `409`. Read `apiCode`. |
| `ValidationError` | `validation_error` | `422`. Read `errors`. |
| `RateLimitError` | `rate_limit` | `429`. Read `retryAfter` and `limit`. |
| `ServerError` | `server_error` | `5xx` |
| `ApiError` | `api_error` | Another error status. It is the parent of the classes above. |
| `ConnectionError` | `connection_error` | The request got no response. |
| `TimeoutError` | `timeout` | One attempt took more time than `timeout`. |

Each `ApiError` has `status`, `body`, `headers`, `requestId` and `apiCode`. `apiCode` is the `code` field of the body. Use `isSnapsbrewError()` and a `switch` on `code` to handle each case.

Set `maxRetries` to `0` to stop retries. Send `idempotencyKey` to make a render safe to retry. The library does not retry a write to an editor document, because a repeat gets a conflict.

## PHP

The package works with any PSR-18 HTTP client. Guzzle is the default. The package also has a Laravel integration: a service provider, a facade, `Snapsbrew::fake()` and a Blade component.

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

The repository has no version tags yet. Without `:dev-main`, Composer looks for a stable version and finds none. If Composer asks for a GitHub token, give a token that can read the repository.

If your project has no PSR-18 HTTP client, also install Guzzle:

```bash
composer require guzzlehttp/guzzle
```

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

The arguments are `url`, `token`, `signingKey`, `timeout` (30 seconds), `retries` (2) and `httpClient`. In Laravel, set `SNAPSBREW_URL`, `SNAPSBREW_TOKEN` and `SNAPSBREW_SIGNING_KEY` in the `.env` file of your app.

### Signed URLs

```php
$snapsbrew = new Snapsbrew(url: 'https://snapsbrew.example', signingKey: getenv('SNAPSBREW_SIGNING_KEY'));

$url = $snapsbrew->signedUrl($templateId)
    ->text('title', 'Hello')
    ->format('png')
    ->url();
```

In a Blade view, the `<x-snapsbrew::image>` component signs the URL on the server and writes the `<img>` tag.

### Errors and retries

Each exception extends `Snapsbrew\Exceptions\SnapsbrewException`:

| Exception | Cause |
|---|---|
| `AuthenticationException` | `401` |
| `AuthorizationException` | `403` |
| `NotFoundException` | `404` |
| `ConflictException` | `409`. `errorCode()` gives the code. |
| `ValidationException` | `422`. `errors()` gives the messages for each field. |
| `RateLimitException` | `429`. `retryAfter()`, `limit()` and `remaining()` give the headers. |
| `ServerException` | `5xx` |
| `ApiException` | Another `4xx` status. It is the parent of the HTTP exceptions. |
| `ConnectionException` | The request got no response. |
| `UnexpectedResponseException` | The body does not have the expected shape. |
| `MissingCredentialsException` | The client has no URL, token or signing key for the call. |

`requestUuid()` gives the request ID. To stop retries, pass `retries: 0`. To change the delays, pass a `Snapsbrew\Http\RetryPolicy`.

## Python

The package has one dependency, `httpx`. It has a sync client, `Snapsbrew`, and an async client, `AsyncSnapsbrew`, with the same methods.

### Install

```bash
pip install "git+https://github.com/amedina068/snapsbrew-python.git"
```

With uv, run `uv add "git+https://github.com/amedina068/snapsbrew-python.git"`. Git asks for your GitHub credentials, because the repository is private. You can also use the SSH form: `git+ssh://git@github.com/amedina068/snapsbrew-python.git`.

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

The settings are `base_url` (default `$SNAPSBREW_URL`), `token` (default `$SNAPSBREW_TOKEN`), `timeout` (30 seconds), `max_retries` (2) and `http_client`. Use the client as a context manager, or call `client.close()`.

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

### Errors and retries

Each error extends `SnapsbrewError`:

| Class | Cause |
|---|---|
| `APIConnectionError` | The request got no response. `APITimeoutError` is a subclass for a timeout. |
| `BadRequestError` | `400` |
| `AuthenticationError` | `401` |
| `AuthorizationError` | `403` |
| `NotFoundError` | `404` |
| `ConflictError` | `409`. `code` gives the cause, and `retryable` tells if a repeat can work. |
| `ValidationError` | `422`. `errors` has the field errors. |
| `RateLimitError` | `429`. Read `retry_after`, `limit` and `remaining`. |
| `ServerError` | `5xx` |
| `WaitTimeoutError` | `batches.wait()` did not see a terminal status in time. |

Each `APIError` has `status_code`, `message`, `body`, `code`, `request_id` and `response`. Set `max_retries=0` to stop retries.

## Ruby

The gem uses the Ruby standard library only. It has a Railtie, a generator and view helpers for Rails.

### Install

Add the gem to your Gemfile:

```ruby
gem "snapsbrew", github: "amedina068/snapsbrew-ruby"
```

Then run `bundle install`. Bundler needs a GitHub credential that can read the repository, for example from `bundle config set --global github.com <username>:<token>`.

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

The settings are `url`, `token`, `signing_key`, `timeout` (60 seconds) and `max_retries` (2). If a setting is not configured, the gem reads `SNAPSBREW_URL`, `SNAPSBREW_TOKEN` or `SNAPSBREW_SIGNING_KEY`. In a Rails app, the gem also reads the Rails credentials.

The variants Hash maps a layer key to a value. A string becomes `text`, an `http` or `https` URL becomes `image_url`, and `false` or `nil` hides the layer.

### Signed URLs

```ruby
Snapsbrew.signed_url(template: template_id, title: "Hello", format: "webp")
```

Each keyword other than `template`, `variants`, `format` and `transparent` is a layer. In a Rails view, `snapsbrew_image_tag` and `snapsbrew_og_image_tag` sign the URL on the server.

### Errors and retries

Each error is a `Snapsbrew::Error`:

| Error | Cause |
|---|---|
| `Snapsbrew::ConfigurationError` | A setting is missing, for example `url` or `token`. |
| `Snapsbrew::ConnectionError` | The connection failed or timed out. |
| `Snapsbrew::AuthenticationError` | `401` |
| `Snapsbrew::AuthorizationError` | `403` |
| `Snapsbrew::NotFoundError` | `404` |
| `Snapsbrew::ConflictError` | `409`. `code` gives the cause. |
| `Snapsbrew::ValidationError` | `422`. `errors` has the field errors. |
| `Snapsbrew::RateLimitError` | `429`. Read `retry_after` and `limit`. |
| `Snapsbrew::ServerError` | `5xx` |
| `Snapsbrew::ApiError` | Another status. It is the parent of the HTTP errors. |

Each `ApiError` has `status`, `body`, `message`, `code` and `request_id`. Set `max_retries` to `0` to stop retries.

The Ruby gem does not cover the editor document endpoints and the embedded form endpoint yet.
