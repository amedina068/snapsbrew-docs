---
title: Signed URLs
description: The reference of the signed image route, which renders a snap from a URL that your server signs, with no API token.
order: 13
---

# Signed URLs

The signed URL route renders a snap from the query string of a URL. Your server signs the URL with a signed-URL key, so the request needs no API token. This page is the reference of the route. To get a key, sign a URL and put it in a page, read [Signed URLs](../using-snapsbrew/signed-urls.md).

| Method | Path | What it does |
|---|---|---|
| `GET` | `/signed-url/image.jpg` | Renders a snap, or finds the cached image, and redirects to the image. |

## Render a signed URL

```http
GET /signed-url/image.jpg
```

- **Auth:** the `signature` in the URL, made with a signed-URL key of the template owner
- **Ability:** `signed_url`, on the token of the signed-URL key
- **Rate limit:** `signed-url`: 600 requests a minute for one IP address
- **Usage log:** yes, on the account of the template owner, for each render

The route is on the root of the instance, not under `/api`. The full URL is `https://snapsbrew.example/signed-url/image.jpg`.

The owner can change the limit with `SNAPSBREW_SIGNED_URL_REQUESTS_PER_IP`. The `api` limit does not apply to this route.

The route renders the published version of the template. A request for a URL that the instance rendered before reads the cached image. It renders nothing and writes no row in the usage log.

### Parameters

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `template_id` | query | string | Yes | The UUID of the template. The signed-URL key must belong to the user who owns the template. |
| `variants` | query | string | No | The JSON list of variants, encoded with standard base64 (`+`, `/` and `=` padding). The route does not accept base64url. |
| `format` | query | string | No | `png` (the default), `jpeg` or `webp`. Another value renders `png`. |
| `transparent` | query | string | No | `1` or `true` renders on a transparent background. It works with `png` and `webp` only. |
| `signature` | query | string | Yes | The lowercase hex HMAC-SHA256 of the other parameters, 64 characters. |

Each parameter in the URL is part of the signature, also a parameter that the route does not read. Do not send `identifier` or `api_log_uuid`. The route keeps these two names for its own use, and a URL with one of them returns `400`.

The variant rules are the same as for a snap. See [Variants](snaps.md#variants).

### Request example

Sign the URL on your server first. The full signing script is in [Sign a URL](../using-snapsbrew/signed-urls.md#sign-a-url). Then send the request:

```bash
curl -i 'https://snapsbrew.example/signed-url/image.jpg?template_id=141e8454-8aa1-420a-bd0b-18a85ba949a2&variants=W3sibGF5ZXIiOiJoZWFkbGluZSIsInRleHQiOiJIZWxsbyJ9XQ%3D%3D&signature=<hex>'
```

### Response

`302` redirects to the image. The `Location` header holds the URL of the image file:

```http
HTTP/1.1 302 Found
Location: https://snapsbrew.example/storage/snaps/9f1c2d3e.png
```

| Status | Cause |
|---|---|
| `200` | The route returns a placeholder PNG image. This occurs when the signature is missing, when no active key of the template owner matches the signature, when the template does not exist, or when the owner is deactivated. |
| `302` | The image rendered, or a cached image exists. |
| `400` | The decoded `variants` fail the variant rules, the URL has `format=jpeg` with `transparent`, or the URL has a reserved parameter. |
| `429` | The `signed-url` limit for the IP address is full. Wait for the number of seconds in `Retry-After`. |

A bad signature does not return an error status. If you get the placeholder image, make sure that the key belongs to the template owner. Also make sure that the key is active.

The `400` messages are `Invalid variants payload.`, `Transparency is not supported for the JPEG format.` and `The signed URL has a reserved parameter.`
