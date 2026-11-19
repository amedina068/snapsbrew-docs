---
title: Release notes
description: The changes to Snapsbrew that users can see, newest first.
order: 6
---

# Release notes

This page lists the changes to Snapsbrew that users can see. The newest date is first.

For developers, `CHANGELOG.md` in the app repository lists the changes to the code for each version.

## Version 0.1.0

Version 0.1.0 is the first public release. It is not released yet. This list gives its main features. The dated notes below give each change.

- Template editor in the browser with text, image, shape, SVG pattern, QR code and barcode layers, groups, custom fonts and brand tokens. Each publish freezes a template version.
- REST API to render one snap, a collection or a batch of up to 100 items, in sync or async mode, with webhooks and idempotency keys. The API docs at `/documentation` come from one spec, with an OpenAPI schema and a Postman collection.
- Signed image URLs for `og:image` tags. The first request renders the image and later requests read the cache.
- Embedded forms that render a template from the values that a person types.
- Spreadsheet imports: one snap for each row of a CSV or XLSX file.
- Screenshots of web pages.
- MCP server for AI agents, with API token or OAuth 2.0 access, design guidance tools and creative packages.
- Usage log of each request and each render.
- Teams with invitations and two-factor authentication.
- Self-hosting with Docker Compose: web, Horizon, scheduler, MySQL, Redis and Browserless.
- A Docker image on GHCR for each release, for `linux/amd64` and `linux/arm64`, and `docker-compose.image.yml` to run it without a build.
- First-run setup page at `/setup` and the `snapsbrew:install` command to create the owner of the instance.
- Six starter templates: a link preview, a quote card, a certificate, an announcement, a blog header and a YouTube thumbnail. The setup page and `snapsbrew:install` offer them, and `snapsbrew:starter-templates` adds them to any account.
- Invite-only and open registration modes, an owner role, user deactivation and account recovery commands.
- Optional Rollbar error reports and S3-compatible media storage.

## November 18, 2026

- The template page has a **Delete template** button with a confirmation.
- **Admin > Users** has a **Delete** button next to **Reactivate** and **Deactivate**. It deletes the user and the personal data of the user. If the user is the last member of the company, it also deletes the company and its content.
- `php artisan snapsbrew:install --demote=<email>` removes the owner flag from a user. It refuses to demote the last owner.
- The collection page has a **Remove from collection** button on each template and a **Delete collection** button. Both ask for a confirmation. A collection delete also deletes the forms of the collection. The templates stay.
- Each webhook carries `X-Snapsbrew-Delivery`, `X-Snapsbrew-Timestamp` and `X-Snapsbrew-Signature`. The signature is the HMAC-SHA256 of `{timestamp}.{body}` with the secret of the company. **Account > Developers** shows the secret and rotates it.
- An async snap that fails to render posts a `snap.failed` webhook. The snap in the body has `status: failed` and `last_error: render_failed`.
- The scheduled commands that use `withoutOverlapping()` also use `onOneServer()`. On more than one server, set a shared cache (`CACHE_DRIVER=redis`), so that only one server runs each command.
- `HORIZON_MAX_PROCESSES` sets the number of Horizon workers. Without it, the counts stay 10 in production and 3 in local.
- The default `BROWSERLESS_TIMEOUT` is 15 seconds, not 60. Horizon stops a render job at 60 seconds, so with 60 seconds for each attempt, attempts 2 and 3 never ran. The Compose files set the Browserless `TIMEOUT` to 15000 ms.
- A signed URL accepts the key of any active user in the company of the template, not only the keys of the template owner. The usage log and the snap name the user whose key signed the URL.
- The spreadsheet import maps a barcode column to `barcode_content`. Before, it read the cell as the background color of the layer. The downloaded import template shows the barcode value in the example row.
- The browser editor shows a message when the API refuses a save with 409, because the template has a v2 editor document. Before, the **Save** button showed nothing.
- A delete of a published template with rendered snaps failed with a foreign key error, in the API too. The delete now removes the snaps, the images, the versions and the forms of the template, and the links to its collections.
- The app loads no Plausible analytics script. The app does not read PLAUSIBLE_DOMAIN and PLAUSIBLE_SCRIPT_URL, so you can remove them from `.env`.
- The certificate creator tool shows the text of the request. Before, it showed the default text of the template.
- A screenshot request with no `url` returns 422 with an error on `url`. Before, it returned 500.
- On a template with a v2 editor document, the MCP tool `edit-template` returns the error `legacy_edit_rejected_for_v2` and changes nothing. Before, it saved the layers.
- With `RENDER_DRIVER=browsershot`, PDF renders use the same Node, npm and remote Chrome settings as image renders.
- The spreadsheet import and the downloaded spreadsheet use the layer keys of the published version, not the keys of the draft.
- The template form page and the collection form page show a **Submit link** field.
- The top menu has a **Fonts** link.
- The app repository has the OpenAPI spec and the Postman collection in `docs/api`. `php artisan api:export` writes these files again.

## November 17, 2026

- The free tools render only the template that the operator sets for each tool, change only the fixed fields of the tool, take an image of 2 MB or less and allow 5 requests each minute for each IP.
- The invitation mail shows the company name and the inviter name as text, not as Markdown. The onboarding steps close after onboarding. A company can send 20 invitations each day (`SNAPSBREW_INVITATIONS_PER_COMPANY_PER_DAY`).
- `POST /oauth/register` allows 3 registrations each minute for each IP, takes 5 redirect URIs or fewer and a body of 16 KB or less. The daily `oauth-clients:prune` command deletes registered clients that got no token in 7 days.
- The Docker Compose files publish the app on `127.0.0.1` by default (`APP_BIND`). The docs name the proxy addresses for `TRUSTED_PROXIES` instead of `*`. A login also has a limit of 10 attempts each minute for one email from all IPs together.
- A failed render stores the fixed code `render_failed` in `last_error`. The API, the MCP server and the import page no longer show the message of the renderer. The log keeps that message.
- A screenshot takes a width and a height from 1 to 4000 pixels, the same bounds as a template canvas.
- The import template writes every cell as text, so layer text that starts with `=` is not a formula in Excel. An import reads a cell that starts with `=` as text and never computes it.
- Only the owner of a signed URL key can revoke it. Before this change, every user of the same company was able to revoke it.
- `.env.example` sets `APP_ENV=production` and `APP_DEBUG=false`. Only the owner opens Horizon, also in the `local` environment. The session cookie is secure by default when `APP_URL` starts with `https`.
- `SafeUrl` refuses the shared range `100.64.0.0/10`, the NAT64 prefixes, 6to4 and the other non-global ranges. It trusts the host of `APP_URL` only on the scheme and port of `APP_URL`.
- An image field of an embedded form takes only an uploaded jpg, jpeg, png, gif, webp or bmp file of 10 MB or less. A color field takes a hex, `rgb()`, `rgba()`, `hsl()` or `hsla()` value, or a color name.
- The media upload, the embedded forms and the free graph image tool store each image under a random name with the extension of its image type. The app refuses SVG uploads.
- The pages of the app show user text as text. Vue no longer compiles user text as a template.
- An SVG shape takes only an allow list of SVG elements and attributes. A shape with another element or attribute renders empty, and the editor refuses it.
- Outside `APP_ENV=local`, the app accepts only the host of `APP_URL`, the hosts of `APP_PREVIOUS_URLS` and the local hosts. Links, for example password reset links, use `APP_URL`.
- A signed URL that contains `identifier` or `api_log_uuid` gets status 400. The signed URL route allows 600 requests each minute for each IP (`SNAPSBREW_SIGNED_URL_REQUESTS_PER_IP`).
- Webhooks do not follow redirects. A failed webhook stores a fixed code in `last_error`: `webhook_redirect_refused`, `webhook_unreachable` or `webhook_http_<status>`.
- A revoked signed-URL key cannot render a new image. A URL that the key rendered before keeps its cached image. To stop these images, publish the template again.
- A 500 error of `POST /api/v1/snaps` returns a fixed message and the code `internal_error`. The response no longer shows the message of the exception.
- The embedded form routes have rate limits. A request over a limit gets status 429, the code `rate_limited` and a `Retry-After` header.
- The app no longer has the public snap page `GET /snaps/{snapId}`.
- The edit and the update of a template form work. Before, they returned 404.
- The **Developers** tab of the account page has an **OAuth connections** panel. It lists each authorized client, and you can revoke each connection there.
- The `variants` schema of the MCP tools lists `barcode_content`.
- `POST /v1/snaps` returns 403, not 401, for a refused permission. Each idempotency 409 has a `code`: `idempotency_key_in_progress`, `idempotency_key_belongs_to_snap` or `idempotency_key_belongs_to_batch`.
- `POST /v1/snaps` with the idempotency key of a batch returns 409, not 500.
- Each item of `GET /v1/screenshots` has the image URL in `image_url`.
- The signed URL guide uses standard base64 and signs the raw sorted values. It has examples in PHP, JavaScript, Python and Ruby.
- `POST /v1/media` and `GET /v1/media` return only the nine documented fields of a media item.
- A 500 error of `POST /v1/snaps/batches` returns a fixed message and the code `internal_error`.
- The `image_url` of a screenshot is null when the screenshot has no image. Before, it was an empty string.
- A new size preset: A4 Landscape (3508x2480).
- The app has no billing, no trial and no credit balance. The usage log is a history only.
- The app has no marketing pages and no free tools web pages. The free tools API returns 404 until `SNAPSBREW_FREE_TOOLS_ENABLED` is true.

## November 16, 2026

- The free screenshot tool works again. Before, each request returned 500.

## October 29, 2026

- A signed URL whose render failed renders again on the next request. Before, it sent the visitor to the home page.
- `php artisan snaps:prune-stale-signed-url-snaps` lists the snaps of failed signed URL renders. With `--force`, it deletes them.

## September 25, 2026

- The app has the `ses-v2` mailer next to the `ses` mailer.
- `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY` and `AWS_SES_REGION` set separate keys for Amazon SES. Without them, the app uses the shared `AWS_*` keys.
- `AWS_SES_CONFIGURATION_SET` adds an SES configuration set to each email.

## September 24, 2026

- You can install Snapsbrew as a web app (PWA). If the network is not available, the app shows an offline page. The app does not cache account pages, API responses or writes.

## September 23, 2026

- The MCP tools `export-creative-package` and `get-creative-package` export 1 to 10 published template versions as one creative package. The package has a manifest with a sha256 for each file and short-lived signed file URLs.

## September 20, 2026

- The MCP tools `preview-design` and `create-snap-from-design` render a snap from an inline design, with no template. `preview-design` returns watermarked HTML and saves nothing.

## September 18, 2026

- `GET /v1/templates/{uuid}`, `GET /v1/auth`, `GET /v1/screenshots/{uuid}`, `POST /v1/screenshots` and `POST /v1/templates/{uuid}/publish` return the object in `data`. This is a breaking change. Read `response.data.uuid`, not `response.uuid`.
- `POST /v1/templates` returns a fixed set of fields, not every column of the template. This is a breaking change.
- `width` and `height` are integers in each template response. `GET /v1/templates/{uuid}` returns `size`.
- `PATCH /v1/templates/{uuid}` and `DELETE /v1/templates/{uuid}` accept the template UUID. Before, they read the numeric id.
- `PATCH /api/v1/templates/{id}` with only a `title` no longer returns 500. A field that the request does not send keeps its stored value.
- The browser editor makes a new preview after a resize of the canvas.
- If a request sets the size preset that the template already has, the template keeps that preset. Several presets have the same dimensions.
- `GET /v1/auth` returns `company`, the name of the company of the user.
- A user of the same company can read the editor document of a template and its preflight. Before, only the user who made the template could read them.

## September 17, 2026

- New guide endpoints: `GET /v1/guides/design`, `/v1/guides/layers`, `/v1/guides/variant-properties`, `/v1/guides/editor-document`, `/v1/guides/platforms` and `/v1/guides/purposes`. They return the same catalogs as the MCP guide tools.
- `POST /v1/templates/{templateUuid}/publish` publishes a template.
- A repeated publish of a template with no changes makes no new version. A change to the width, the height or the editor document counts as a change.
- `PATCH /v1/templates/{templateUuid}/document` applies editor operations to the editor document, as the MCP tool `apply-editor-operations` does.
- `GET /v1/templates/{templateUuid}` returns `published_version` and `has_unpublished_edits`.

## September 15, 2026

- The REST API and the MCP tools `get-editor-document` and `put-editor-document` read and replace the v2 editor document of a template. Each write gives the revision that it read, so a write cannot overwrite a newer draft.
- The MCP tools `describe-editor-document`, `apply-editor-operations` and `preflight-editor-document` describe the document format, change the draft and examine the draft before a publish.
- The v2 editor document supports image crop masks and a focal point, font weight, style and letter spacing, blur and stroke effects, transform origin and clipping, inline SVG shapes, reusable components, brand tokens and responsive canvases.
- A queued snap renders from the template version that existed when the request came in.

## September 11, 2026

- `POST /api/v1/snaps` and the MCP tool `create-snap` accept an optional `idempotency_key`. A retry with the same key in 24 hours returns the first snap.
- `POST /api/v1/snaps/batches` and the MCP tool `create-snaps-batch` render up to 100 snaps of one template in one call. `GET /api/v1/snaps/batches/{uuid}` and the MCP tool `get-snaps-batch` show the progress.
- `POST /api/v1/snaps/batches/{uuid}/cancel` and the MCP tool `cancel-snaps-batch` stop a running batch. An item that rendered before the cancel keeps its image.
- The spreadsheet import works again. Before, each upload returned 500.
- `webhook_url` must be a public address. The app refuses private, loopback, link-local and reserved addresses.
- New MCP tools `platform-guide` and `image-purpose-guide`. They tell an agent how to make an image for a platform or for a purpose.
- An MCP client can connect with OAuth 2.0 and PKCE. An API token also works.
- A failed MCP tool call returns a JSON error with `code`, `message`, `fix`, `retryable` and `details`.
- The MCP server uses the tool names of the docs, for example `create-snap`, not `create-snap-tool`.

## September 10, 2026

- The spreadsheet import accepts CSV files, as well as XLSX and XLS files.
- Each MCP tool declares `title`, `readOnlyHint`, `destructiveHint` and `openWorldHint`.
- `/llms.txt` lists the API groups for AI agents. `/skill.md` gives an Agent Skill file with the MCP workflow.

## September 9, 2026

- The app has 45 canvas size presets for social networks, the web, email, display ads and print. The MCP tools and the REST API can set the size of a template by the name of a preset.
- The size filter of the template list finds the templates that users make. Before, these templates showed as Custom.

## June 22, 2026

- A snap can be a PNG or a JPEG image. A PNG can have a transparent background.
- A layer can have filters, a blend mode and a flip.
- A text layer can make its text smaller to fit its box.
- A company can upload custom fonts.
- A new barcode layer supports Code 128, EAN-13 and UPC-A.
- You can put layers in a group.
- Each publish of a template makes a version. You can revert a template to an earlier version. A publish clears the cache of the signed URLs of the template.
