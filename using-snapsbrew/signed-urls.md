---
title: Signed URLs
description: Put a signed image URL in an img tag or an og:image tag, and Snapsbrew renders the snap on the first request.
order: 7
---

# Signed URLs

A signed URL is an image link that renders a snap. Put it in an `<img>` tag or an `og:image` meta tag. The first request renders the image. Later requests for the same URL read the cache.

Your server signs each URL with a signed-URL key. The key is a secret. Sign URLs only on your server. Never put the key in a browser, a mobile app or a public repository.

Use a signed URL when your code makes the image. Use an [embedded form](embedded-forms.md) when a person types the values.

## Get a signed-URL key

1. Open **Account > Developers**.
2. In **Signed URL API keys**, click **Generate new key**.
3. Copy the key from the table.

The key is a Sanctum token with the `signed_url` ability. It cannot call the REST API.

You can keep more than one key active. This lets you change keys with no downtime.

The key must belong to the user who created the template. The app looks for the key only in the active keys of that user.

TODO(owner): The key must belong to the user who created the template, not to any user of the company. Is this intended? A template made by another user of the company does not accept your key.

## The URL

```text
https://snapsbrew.example/signed-url/image.jpg?template_id=<uuid>&variants=<base64>&signature=<hex>
```

| Parameter | Required | Description |
|---|---|---|
| `template_id` | Yes | The UUID of the template. |
| `variants` | No | A JSON list of variants, encoded with standard base64. Read [Layers and variants](layers-and-variants.md#variants). |
| `format` | No | `png` (the default), `jpeg` or `webp`. |
| `transparent` | No | `true` renders with no page background. It does not work with `jpeg`. |
| `signature` | Yes | The HMAC-SHA256 of the other parameters, in hex. |

The path ends in `.jpg`, but the `format` parameter sets the real image format.

## Sign a URL

1. Collect all parameters except `signature`. Use the values before URL encoding.
2. Sort the parameters by name.
3. Join them as `name=value` pairs with `&` between the pairs.
4. Calculate the HMAC-SHA256 of this string. Use the signed-URL key as the secret.
5. URL-encode each parameter value and build the query string.
6. Add the hex HMAC as `signature`.

Every parameter in the URL is part of the signature. If you add a parameter after you sign, the signature does not match.

The order of the parameters in the final URL is not important. The server sorts them again.

Encode `variants` with standard base64, with `+`, `/` and `=` padding. Do not use base64url. The server decodes standard base64, so a base64url value decodes to the wrong bytes.

### PHP

```php
<?php

$key = '<signed-url-key>'; // read it from your secret store

$variants = [
    ['layer' => 'headline', 'text' => 'Summer sale'],
    ['layer' => 'logo', 'image_url' => 'https://example.com/logo.png'],
];

$fields = [
    'template_id' => '141e8454-8aa1-420a-bd0b-18a85ba949a2',
    'variants' => base64_encode(json_encode($variants)),
];

ksort($fields);

$signString = implode('&', array_map(
    fn ($name, $value) => "{$name}={$value}",
    array_keys($fields),
    $fields,
));

$signature = hash_hmac('sha256', $signString, $key);

$url = 'https://snapsbrew.example/signed-url/image.jpg?'
    .http_build_query($fields)
    .'&signature='.$signature;
```

The PHP code in `App\Support\SignedImageUrl` signs URLs in the same way.

### curl

This script signs the URL in a shell and downloads the image:

```bash
key='<signed-url-key>'
template_id='141e8454-8aa1-420a-bd0b-18a85ba949a2'
variants=$(printf '%s' '[{"layer":"headline","text":"Summer sale"}]' | base64 -w0)

signature=$(printf '%s' "template_id=${template_id}&variants=${variants}" \
  | openssl dgst -sha256 -hmac "$key" | awk '{print $NF}')

curl -L --get 'https://snapsbrew.example/signed-url/image.jpg' \
  --data-urlencode "template_id=${template_id}" \
  --data-urlencode "variants=${variants}" \
  --data-urlencode "signature=${signature}" \
  --output card.png
```

On macOS, `base64` has no `-w0` option. Use `base64` with no option.

### Node.js (server side)

```js
import { createHmac } from 'node:crypto';

const key = '<signed-url-key>'; // read it from your secret store

const fields = {
  template_id: '141e8454-8aa1-420a-bd0b-18a85ba949a2',
  variants: Buffer.from(JSON.stringify([
    { layer: 'headline', text: 'Summer sale' },
  ])).toString('base64'),
};

const names = Object.keys(fields).sort();
const signString = names.map((name) => `${name}=${fields[name]}`).join('&');
const signature = createHmac('sha256', key).update(signString).digest('hex');

const url = new URL('https://snapsbrew.example/signed-url/image.jpg');
for (const name of names) url.searchParams.set(name, fields[name]);
url.searchParams.set('signature', signature);
```

## Use the URL

```html
<meta property="og:image" content="https://snapsbrew.example/signed-url/image.jpg?template_id=...&variants=...&signature=...">

<img src="https://snapsbrew.example/signed-url/image.jpg?template_id=...&variants=...&signature=..." alt="Share card">
```

The endpoint answers with a redirect to the image file. Browsers, crawlers and email clients follow the redirect.

## Cache

The app makes a cache key from the path, the query string and the published version of the template.

- The first request renders the snap and writes one row in the usage log of the template creator.
- A later request for the same URL redirects to the stored image. It renders nothing.
- A change to any parameter makes a new URL and a new render.
- A publish of the template changes the cache key. The next request renders the new version.

The app finds a cached image before it checks the signature. The cache key includes the signature, so only a URL that a valid key signed can have a cached image. A cached URL keeps working after you revoke its key.

## Errors

The endpoint does not return an error for most problems. It returns a neutral placeholder image instead. You get the placeholder when:

- The template does not exist.
- The user who created the template is deactivated.
- The `signature` parameter is missing.
- No active key of the template creator matches the signature.

A placeholder is the sign of a bad signature, a revoked key or a wrong template id.

The endpoint returns `400` when:

- The `variants` value does not pass the variant rules. An `image_url` must be a public address.
- The URL has `format=jpeg` and `transparent=true`.

## Revoke a key

1. Open **Account > Developers**.
2. In **Signed URL API keys**, click **Revoke** next to the key.

The key cannot render a new image. A URL that the app did not render yet gets the placeholder image. A URL that the app already rendered keeps its image. The status of the key changes to **Revoked**.

To stop the images that a revoked key rendered, publish the template again. A publish changes the cache key, so the next request needs a valid key.

## Related pages

- [Signed URLs API reference](../api/signed-urls.md)
- [Layers and variants](layers-and-variants.md)
- [Embedded forms](embedded-forms.md)
- [Snaps](snaps.md)
