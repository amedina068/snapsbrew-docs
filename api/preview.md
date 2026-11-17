---
title: Preview
description: Render a template or a planned snap as watermarked HTML, with no stored snap.
order: 10
---

# Preview

A preview renders a template, with or without variants, as one self-contained HTML document. The instance makes no image and stores no snap. Use a preview to adjust the variants. Then send the same variants to [`POST /v1/snaps`](snaps.md#create-a-snap) for the final image.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/v1/templates/{templateUuid}/preview` | Previews a template, with optional variants. |
| `GET` | `/v1/snaps/preview` | Previews the snap that you plan to create. |

For each endpoint:

- **Auth:** bearer token
- **Ability:** `api_requests`
- **Rate limit:** `preview` (10 a minute) and `api` (60 a minute)
- **Usage log:** no

## The preview document

- The response is `text/html`, not JSON.
- A preview renders the same version as a snap: the published version, or the draft when the template has no published version.
- The document shows a "PREVIEW" watermark. The owner can turn off the watermark with `SNAPSBREW_PREVIEW_WATERMARK=false`. See [Configuration](../self-hosting/configuration.md).
- The response carries `Cache-Control: no-store, max-age=0`, `X-Robots-Tag: noindex` and `X-Snap-Preview: true`.
- The preview is not a final asset. Do not publish it.

## Send variants in the query string

Both endpoints take `variants` as a query array. Each item names a layer and one property:

```text
variants[0][layer]=headline&variants[0][text]=Hello
variants[1][layer]=logo&variants[1][image_url]=https://example.com/logo.png
```

The variant rules are the same as for a snap. See [Variants](snaps.md#variants).

## Preview a template

```http
GET /v1/templates/{templateUuid}/preview
```

| Parameter | In | Required | Description |
|---|---|---|---|
| `templateUuid` | path | Yes | The UUID of the template. |
| `variants` | query | No | The layer overrides. |

Without `variants`, the preview shows the default content of each layer.

## Preview a snap

```http
GET /v1/snaps/preview
```

| Parameter | In | Required | Description |
|---|---|---|---|
| `template_id` | query | Yes | The UUID of the template. |
| `variants` | query | No | The layer overrides. |

## Errors

| Status | Cause |
|---|---|
| `404` | The template is not in your company. |
| `422` | A field failed a rule, for example an `image_url` that is not public, or no `template_id`. |
| `429` | The `preview` limit of 10 a minute is full. Wait for the time in `Retry-After`. |

## Examples

```bash
curl 'https://snapsbrew.example/api/v1/snaps/preview?template_id=<uuid>&variants[0][layer]=headline&variants[0][text]=Hello' \
  -H 'Authorization: Bearer <your-token>' \
  --output preview.html
```

```php
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

$variants = [['layer' => 'headline', 'text' => 'Hello']];

$html = Http::withToken(config('services.snapsbrew.token'))
    ->get('https://snapsbrew.example/api/v1/snaps/preview', [
        'template_id' => $templateUuid,
        'variants' => $variants,
    ])
    ->throw()
    ->body();

Storage::put('previews/headline.html', $html);

// When the preview is correct, render the final snap with the same variants.
```

The Laravel `Http` client encodes the nested `variants` array in the query string.
