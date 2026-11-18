---
title: Embedded forms
description: Share or embed a signed form that renders a template from the values that a person types.
order: 8
---

# Embedded forms

An embedded form renders a snap from the values that a person types. The person needs no account and no API token. The signature in the link is the credential.

Use an embedded form when a person types the values. Use a [signed URL](signed-urls.md) when your code makes the image.

To create a form, read [Collections and forms](collections-and-forms.md).

## The form link

Each form has a signed link to the hosted form page:

```text
https://snapsbrew.example/embedded-form/<formUuid>?signature=<signature>
```

The form page shows **Embedded form link**. Copy the link from there.

The app signs the link with `APP_KEY`. The link has no expiry date. A changed or missing signature gets a `401` error on the form page.

CAUTION: Do not change `APP_KEY` on an instance with shared forms. A new key makes all form links invalid.

## Embed the form

The form page allows framing in an `<iframe>`:

```html
<iframe src="https://snapsbrew.example/embedded-form/<formUuid>?signature=<signature>"
        width="100%" height="640" frameborder="0"></iframe>
```

You can also send the link to a person.

## The fields

The form shows one field for each layer that the form owner selected. The layer type sets the field:

| Layer type | Field | Value key |
|---|---|---|
| `text` | Text input | `text` |
| `empty` | Color picker | `background_color` |
| `qr_code` | Text input, or URL input for URL content | `qr_content` |
| `barcode` | Text input | `barcode_content` |
| `image` | File upload | `image_url` |

The field shows the current value of the layer as the default.

When the person clicks **Submit**, the page sends the values. The snap shows on the page.

## Post to the form from your own UI

You can send the values to the submit URL without the hosted page:

```text
POST https://snapsbrew.example/api/v1/embedded-forms/<formUuid>?signature=<signature>
```

The body is `multipart/form-data`. Each value goes in `layers[<key>]`. An image layer takes a file.

```bash
curl -X POST 'https://snapsbrew.example/api/v1/embedded-forms/<formUuid>?signature=<signature>' \
  -F 'layers[headline]=Summer sale' \
  -F 'layers[logo]=@logo.png'
```

```php
<?php

use Illuminate\Support\Facades\Http;

$response = Http::attach('layers[logo]', file_get_contents('logo.png'), 'logo.png')
    ->post('https://snapsbrew.example/api/v1/embedded-forms/<formUuid>?signature=<signature>', [
        'layers[headline]' => 'Summer sale',
    ]);

$snap = $response->json('data');
```

The submit URL has its own signature. The app stores it as `submit_signed_url` on the form. The hosted page signs it again for the host that serves the page.

TODO(owner): The form pages show only the form link. Where does a user get the `submit_signed_url` to build a custom UI?

### Layer keys

- A template form uses the plain layer key, for example `layers[headline]`.
- A collection form puts the template UUID in front of the key: `layers[<templateUuid>__headline]`.

The app ignores a key that the form does not have.

### The response

- A template form returns `201` with `{"data": <snap>}`.
- A collection form returns a list of snaps, one for each template. The list has no `data` wrapper.
- A bad or missing signature gets a `404` error.
- A collection form with no templates gets a `422` error.

The full shapes are in [Embedded forms API](../api/embedded-forms.md).

## Render and usage

The submit renders in the request. A form renders the published version of each template. The form type sets the output: an image or a PDF.

Each render writes a row in the usage log of the form owner. A template form writes one render. A collection form writes one render for each template.

An uploaded image goes into the media library of the form owner.

The submit route allows 10 requests a minute for one IP address and 60 a minute for one form. A request over a limit gets `429` and renders nothing. Read [Embedded forms](../api/embedded-forms.md#submit-an-embedded-form).

## Forms after a host change

The signature covers the host of the URL. If the instance moves to a new host, old links fail on the new host.

To keep old links working, put the old hosts in `APP_PREVIOUS_URLS`, separated by commas. The app then accepts a signature that it made on one of these hosts. Read [Configuration](../self-hosting/configuration.md).

## Deactivated owners

If the owner of a form is deactivated, the form page and the submit route return `404`. The app records no render. Read [Accounts and registration](../self-hosting/accounts-and-registration.md).

## Related pages

- [Collections and forms](collections-and-forms.md)
- [Embedded forms API](../api/embedded-forms.md)
- [Signed URLs](signed-urls.md)
