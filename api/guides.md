---
title: Guides
description: Read the static catalogs for layers, variants, design rules, platforms, image purposes and the editor document contract.
order: 3
---

# Guides

The guide endpoints return static reference catalogs. The content is the same for each account, so you can keep a response in a cache. Refresh the cache when the API version changes.

The guide endpoints read no template and no company data. A guide call does not go into the usage log.

| Method | Path | What it returns |
|---|---|---|
| `GET` | `/v1/guides/design` | Design rules for a template. |
| `GET` | `/v1/guides/layers` | The layer object shape and each design-time property. |
| `GET` | `/v1/guides/variant-properties` | Each property that `variants` accepts. |
| `GET` | `/v1/guides/editor-document` | The v2 editor document contract. |
| `GET` | `/v1/guides/platforms` | One line for each platform. |
| `GET` | `/v1/guides/platforms/{platform}` | The full rules of one platform. |
| `GET` | `/v1/guides/purposes` | One line for each image purpose. |
| `GET` | `/v1/guides/purposes/{purpose}` | The full rules of one image purpose. |

For each endpoint:

- **Auth:** bearer token
- **Ability:** `api_requests`
- **Rate limit:** `api` (60 a minute)
- **Usage log:** no

The MCP server serves the same catalogs as tools. See [MCP tools reference](../mcp/tools-reference.md).

## Get the design guide

```http
GET /v1/guides/design
```

Returns the canvas presets, the back-to-front layer order, typography and color rules, composition recipes, anti-patterns and a preflight checklist. Read it before you write a `layers` array.

```json
{
  "data": {
    "typography": {
      "scale": "On a 1080px canvas: headline 64–120px, subhead 36–56px, body 24–36px."
    }
  }
}
```

The example shows one entry only.

## Get the layer schema

```http
GET /v1/guides/layers
```

Returns the layer object shape, each property name, the value shape of each property, the SVG pattern designs and a worked example. A template write accepts layers in this shape. See [Layers and variants](../using-snapsbrew/layers-and-variants.md).

```json
{
  "data": {
    "property_names": ["textContent", "backgroundType", "fontFamily"]
  }
}
```

The example shows one entry only.

## List variant properties

```http
GET /v1/guides/variant-properties
```

Returns each property that you can set on a layer in `variants`. Each entry has the value type, the layer types that accept it and an example.

| Property | Value type | Applies to |
|---|---|---|
| `text` | string | Text layers |
| `image_url` | string (public `http` or `https` URL) | Image and background-image layers |
| `background_color` | string (`#hex`) | Layers with a background |
| `qr_content` | string | QR code layers |
| `barcode_content` | string | Barcode layers |
| `hidden` | boolean | Any layer |

```json
{
  "data": [
    {
      "property": "text",
      "value_type": "string",
      "applies_to": "text layers",
      "description": "Replace a text layer's content.",
      "example": {"layer": "headline", "text": "Summer Sale — 40% off"}
    }
  ]
}
```

## Get the editor document contract

```http
GET /v1/guides/editor-document
```

Returns the versioned v2 editor document contract. It has the property constraints, the persistence rules, the conflict recovery and a safe workflow. Read it before you change an editor document. See [Editor documents](editor-documents.md).

```json
{
  "data": {
    "contract_version": 2,
    "editor_document_version": 2,
    "resource": "template.editor_document"
  }
}
```

## List platform guides

```http
GET /v1/guides/platforms
```

Returns one line for each platform: the size preset to start from, its dimensions and the reason for that preset. The response also has `specs_reviewed`, the month of the last check of the published specs.

```json
{
  "data": [
    {
      "platform": "instagram",
      "name": "Instagram",
      "start_here": "instagram_post",
      "dimensions": "1080x1350",
      "why": "A 4:5 portrait post fills the most vertical space the feed will give a single image."
    }
  ]
}
```

## Get one platform guide

```http
GET /v1/guides/platforms/{platform}
```

Returns what one platform does to an image. The guide has the crop, the UI safe zones, the formats and the size limits. It also has the export width, the color profile, the size presets, the rules and the anti-patterns.

| Parameter | In | Required | Description |
|---|---|---|---|
| `platform` | path | Yes | A key or an alias. Maximum 64 characters. The keys are `instagram`, `facebook`, `x`, `linkedin`, `threads`, `pinterest`, `tiktok`, `youtube`, `snapchat`, `whatsapp`, `web`, `ads` and `print`. |

The endpoint accepts aliases. `/v1/guides/platforms/insta` returns the same guide as `/v1/guides/platforms/instagram`.

| Status | Cause |
|---|---|
| `404` | No guide matches the key. The body lists each valid key in `available`. |
| `422` | The key has more than 64 characters. |

```json
{
  "message": "No platform guide matches `myspace`.",
  "available": ["instagram", "facebook", "x", "linkedin", "threads", "pinterest", "tiktok", "youtube", "snapchat", "whatsapp", "web", "ads", "print"]
}
```

## List image purpose guides

```http
GET /v1/guides/purposes
```

Returns one line for each image purpose: what the image is, when to use it and the size presets that fit it.

```json
{
  "data": [
    {
      "purpose": "link_preview",
      "name": "Link preview / meta tag image",
      "use_when": "You are shipping a page and you want the shared link to look deliberate.",
      "sizes": ["open_graph", "twitter_card"]
    }
  ]
}
```

## Get one image purpose guide

```http
GET /v1/guides/purposes/{purpose}
```

Returns the job of one kind of image. The guide has the size presets, the rules, the failure modes, a layer recipe, the anti-patterns and a preflight checklist. The `link_preview` purpose also returns the `og:` and `twitter:` meta tags for the page head.

| Parameter | In | Required | Description |
|---|---|---|---|
| `purpose` | path | Yes | A key or an alias. Maximum 64 characters. The keys are `link_preview`, `feed_post`, `carousel`, `story`, `profile_picture`, `cover`, `video_thumbnail`, `ad`, `product_shot`, `email_header`, `article_header` and `presentation_slide`. |

The endpoint accepts aliases. `/v1/guides/purposes/og` returns the same guide as `/v1/guides/purposes/link_preview`.

| Status | Cause |
|---|---|
| `404` | No guide matches the key. The body lists each valid key in `available`. |
| `422` | The key has more than 64 characters. |

## Errors for all guide endpoints

| Status | Cause |
|---|---|
| `401` | The token is missing or wrong. |
| `403` | The token has no `api_requests` ability. |

## Examples

```bash
curl https://snapsbrew.example/api/v1/guides/platforms/instagram \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json'
```

```php
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

// The catalog is the same for each account, so keep it for one day.
$guide = Cache::remember('snapsbrew.guide.instagram', now()->addDay(), function () {
    return Http::withToken(config('services.snapsbrew.token'))
        ->acceptJson()
        ->get('https://snapsbrew.example/api/v1/guides/platforms/instagram')
        ->throw()
        ->json('data');
});
```
