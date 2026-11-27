---
title: Your first snap
description: Copy a starter template, render it in the browser, then render it from the REST API.
order: 4
---

# Your first snap

This page renders one image in the browser and one image from the REST API. You need an instance with an owner account. Read [Install with Docker](installation-docker.md) first.

## Render in the browser

1. Sign in to your instance.
2. If the onboarding page opens, complete it.
3. Open `/templates/new`.
4. Select a starter template and click **Use this**. Snapsbrew copies the template into your company.
5. Open `/templates/<uuid>/generate`. The template card also links to this page.
6. Type new values in the text fields. Each field accepts up to 280 characters.
7. Start the render.

The browser render is async. The queue worker must run. The Docker container starts it. If `QUEUE_CONNECTION` is `redis`, the worker is Horizon. If `QUEUE_CONNECTION` is `sync`, the render runs in the request. Read [Queues and Horizon](../self-hosting/queues-and-horizon.md).

The finished snap is in the list at `/snapshots`.

## Publish the template

Snaps render the published version of a template. If a template has no published version, a snap renders a frozen copy of the current draft.

After you edit a template in the editor, publish it. Then the next snap renders your edit. Read [Templates](../using-snapsbrew/templates.md).

## Render from the REST API

1. Open **Account > Developers**.
2. Create an API token. Give it a name.
3. Copy the token. The page shows it one time.
4. Read the layer keys of your template:

   ```bash
   curl https://snapsbrew.example/api/v1/templates/<uuid> \
     -H 'Authorization: Bearer <your-token>' \
     -H 'Accept: application/json'
   ```

   Each item of `data.layers` has a `layer` key and the changes that the layer accepts in `available_modifications`.

5. Render a snap with new text for one layer:

   ```bash
   curl -X POST https://snapsbrew.example/api/v1/snaps \
     -H 'Authorization: Bearer <your-token>' \
     -H 'Accept: application/json' \
     -H 'Content-Type: application/json' \
     -d '{"template_id":"<uuid>","variants":[{"layer":"headline","text":"Hello world"}]}'
   ```

6. Open the URL in `media_url` of the response.

The call is sync by default. It returns `201` with the finished `media_url`. To queue the render and get a webhook, send `"async": true` and a `webhook_url`. Read [Snaps](../api/snaps.md).

The same call in PHP, with the Laravel HTTP client:

```php
use Illuminate\Support\Facades\Http;

$response = Http::withToken('<your-token>')
    ->acceptJson()
    ->post('https://snapsbrew.example/api/v1/snaps', [
        'template_id' => '<uuid>',
        'variants' => [
            ['layer' => 'headline', 'text' => 'Hello world'],
        ],
    ]);

$imageUrl = $response->json('media_url');
```

## Preview before you render

`GET /v1/snaps/preview` returns a watermarked HTML preview and stores no snap. Use it to test variants. Read [Preview](../api/preview.md).

## Next steps

- [Templates](../using-snapsbrew/templates.md)
- [Layers and variants](../using-snapsbrew/layers-and-variants.md)
- [Signed URLs](../using-snapsbrew/signed-urls.md)
- [MCP overview](../mcp/overview.md)
