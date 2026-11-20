---
title: Architecture
description: The domain model, the render pipeline, the queues and the rules that keep the surfaces of Snapsbrew in sync.
order: 1
---

# Architecture

Snapsbrew is a Laravel 13 app with a Vue 3 editor. It renders images and PDFs from templates with headless Chrome.

This page gives an overview for a contributor. The file `ARCHITECTURE.md` in the app repository describes each table in detail.

## Stack

| Part | Package |
| --- | --- |
| Web framework | Laravel 13 |
| Front end | Vue 3, Vite, Tailwind CSS 4 |
| Login, registration, two-factor authentication | Laravel Fortify |
| API tokens | Laravel Sanctum |
| OAuth for the MCP server | Laravel Passport |
| MCP server | `laravel/mcp` |
| File storage | Spatie Media Library |
| Headless Chrome | Browserless, or Spatie Browsershot |
| Queues | Laravel Horizon on Redis |

## Domain model

| Concept | Description |
| --- | --- |
| Company | The tenant. It owns the templates, the snaps and the other records. A company has one or more users. |
| User | A person in one company. The role is `admin` or `customer`. The `is_owner` flag marks the person who runs the instance. |
| Template | A design with a canvas size and a list of layers. |
| Template version | A frozen copy of the draft of a template. A publish creates a version. |
| Snap | One rendered image or PDF from a template. |
| Snap import | A group of snaps from one template. A spreadsheet import and an API batch both use this model. |
| Template collection | A group of templates. A form or a snap request can render each template in the collection. |
| Form | An embedded form for a template or a collection. |
| Screenshot | A capture of a web page. |
| Creative package | Up to 10 final images from published template versions, with a manifest. |
| API log | One row for each request, with the number of renders. This is the usage log. |
| API key | A signed-URL key. It wraps a Sanctum token with the `signed_url` ability. |

Most queries filter by the `company_id` of the user. `App\Policies\TemplatePolicy` controls the access to a template.

## Draft and published versions

A template has a draft and an optional published version. The editor and the API write the draft. `App\Services\TemplateVersioning` publishes the draft as a new `TemplateVersion`.

`Template::renderableLayers()` returns the layers of the published version. If the template has no published version, it returns the draft layers. Snaps, previews and signed URLs render through this method.

## Render pipeline

```text
request (REST, MCP, signed URL, embedded form, editor, import)
  -> App\Services\SnapService, or a controller
  -> App\Builders\SnapBuilder          builds the HTML body and head
       -> App\Builders\LayerBuilder    builds the HTML and CSS of one layer
  -> Snap::renderDocument()            the full HTML document
  -> App\Contracts\SnapRenderer        HTML to image or PDF bytes
       -> App\Services\BrowserlessRenderer   (RENDER_DRIVER=browserless)
       -> App\Services\BrowsershotRenderer   (RENDER_DRIVER=browsershot)
  -> Spatie Media Library              stores the file on MEDIA_DISK
```

`App\Providers\AppServiceProvider` binds `SnapRenderer` and `PageScreenshotter` to the renderer that `RENDER_DRIVER` selects. Screenshots of web pages use `PageScreenshotter`. Tests bind `Tests\Support\FakeRenderer`, so a test never starts Chrome.

`SnapBuilder` groups the variants of a snap by layer key. `LayerBuilder` applies the variants of each layer to its properties. The code has no `{{ }}` placeholder substitution.

## Queues

`App\Support\Queues` holds the queue names. The Horizon supervisor reads the same list, highest priority first:

| Queue | Work |
| --- | --- |
| `renders` | Interactive renders. A person waits for them. |
| `imports` | Spreadsheet imports, API batches and creative package items. |
| `mail` | Queued mail. |
| `default` | Cleanup and other work. |

A synchronous API request renders in the request. An asynchronous snap goes to the `renders` queue as a `ProcessSnap` job. `App\Services\SnapBatchService` sends a batch to the `imports` queue with `Bus::batch`.

Read [Queues and Horizon](../self-hosting/queues-and-horizon.md) for the operation of the queues.

## Request surfaces

| Surface | Routes | Authentication |
| --- | --- | --- |
| Web app | `routes/web.php` | Session (Fortify) |
| REST API | `routes/api.php`, under `/api` | Sanctum token with the `api_requests` ability |
| Embedded form submit | `routes/api-embedded-form.php` | Signed URL |
| Creative package files | `routes/api-creative-package-media.php` | Signed URL |
| MCP server | `routes/ai.php`, at `/mcp` | Sanctum token, or Passport token with the `mcp:use` scope |
| Signed image URL | `GET /signed-url/image.jpg` | HMAC signature with a signed-URL key |
| Admin area | `/admin`, in `routes/web.php` | The owner only |

`App\Http\Middleware\LogApiRequestMiddleware` writes a usage log row for the API routes that have the `logApiRequest` middleware.

## Usage log

Snapsbrew does not limit renders. The usage log is a history only.

`App\Services\UsageRecorder` writes each usage row. A synchronous request settles the row that the middleware opened. Asynchronous work records its render when the job completes.

## The API spec

`App\Support\ApiDocs\ApiSpec` is the single source of the API documentation. These outputs come from it:

- the docs pages at `/documentation`
- the OpenAPI file at `/documentation/openapi.yaml`
- the Postman collection at `/documentation/postman-collection`
- the Markdown files at `/documentation/{slug}.md`
- `llms.txt`

`Tests\Unit\RoutesToApiSpecTest` compares the routes with the spec in both directions. Read [OpenAPI and Postman](../api/openapi.md).

## Rules that keep the surfaces in sync

The `CONTRIBUTING.md` file of the app repository lists these rules. A pull request that breaks one of them goes back to its author.

1. If you add an endpoint to `routes/api.php`, add it to `ApiSpec.php` in the same change.
2. A new layer property goes to every surface in the same change. Read [Add a layer type](adding-a-layer-type.md).
3. Canvas size presets live only in `App\Support\TemplateSizes`. Never rename the `value` of an existing preset, because the database stores it.
4. Each usage row goes through `App\Services\UsageRecorder`.
5. An editor layer has two shapes. `resources/js/LayersImporter.js` (`normalizeLayer`) adds the editor fields when the editor loads a layer.
6. A new Vue component must be registered in `resources/js/app.js`. An unregistered component renders nothing and shows no error.
7. An MCP tool declares its name with `#[Name]`. `McpToolNamesTest` holds the full list of tool names.
8. A data migration runs on MySQL and on SQLite. Write backfills as `chunkById()` loops with one `UPDATE` for each row.
9. A file upload rule pairs `mimes` with `extensions` and sets `max`.
10. Write a user-facing message for a failure only after a test proves that the failure exists.

## Related pages

- [Development setup](development-setup.md)
- [Testing](testing.md)
- [Add a layer type](adding-a-layer-type.md)
- [Release process](release-process.md)
