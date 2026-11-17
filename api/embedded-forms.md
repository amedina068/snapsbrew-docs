---
title: Embedded forms
description: Submit layer values to a signed form URL and get a rendered snap, with no API token.
order: 12
---

# Embedded forms

An embedded form renders a snap from the values that a person sends. The form URL carries a Laravel signature, so the request needs no API token. The render goes into the usage log of the form owner. See [Embedded forms](../using-snapsbrew/embedded-forms.md) to create a form and embed its page.

| Method | Path | What it does |
|---|---|---|
| `POST` | `/v1/embedded-forms/{formUuid}` | Renders a snap from the values of a form. |

## Submit an embedded form

```http
POST /v1/embedded-forms/{formUuid}?signature=<sig>
```

- **Auth:** the signature in the URL
- **Ability:** none
- **Rate limit:** none
- **Usage log:** yes, on the account of the form owner

Each form has a `submit_signed_url`. Send the request to that exact URL. Do not change the query string. A signature that is wrong or missing returns `404`.

TODO(owner): This route has no rate limit, and each request renders on the account of the form owner. Do you want to add a limiter to it?

### Parameters

| Parameter | In | Required | Description |
|---|---|---|---|
| `formUuid` | path | Yes | The UUID of the form. |
| `signature` | query | Yes | The Laravel URL signature. The instance signs the full URL. |

If the instance moved to a new host, a URL that the old host signed still works. Put the old host in `APP_PREVIOUS_URLS`. See [Configuration](../self-hosting/configuration.md).

### Request body

Send `multipart/form-data`. Put each value under `layers`.

| Layer type | Value | Example |
|---|---|---|
| `text` | Text | `layers[headline]=Summer sale` |
| `image` | A file upload | `layers[logo]=@logo.png` |
| `empty` | A background color | `layers[backdrop]=#ff5a36` |
| `qr_code` | QR content | `layers[ticket]=https://example.com/rsvp` |
| `barcode` | Barcode content | `layers[sku]=012345678905` |

The layer key depends on the form:

- A **template form** uses the plain layer key, for example `headline`.
- A **collection form** puts the template UUID in front of the key: `{templateUuid}__{layerKey}`, for example `141e8454-8aa1-420a-bd0b-18a85ba949a2__headline`.

The instance accepts only the layers of the form configuration. It drops the other layers with no error.

The instance adds each uploaded image to the media library of the form owner.

### Response

`201` for a template form. The body is one snap object, with no `data` key.

```json
{
  "id": "9f1c2d3e",
  "media_url": "https://snapsbrew.example/storage/snaps/9f1c2d3e.png",
  "type": "image",
  "status": "completed",
  "is_async": false,
  "webhook_url": null,
  "completed_at": "2026-05-01T12:00:03Z",
  "last_error": null,
  "variants": [],
  "template_id": "141e8454-8aa1-420a-bd0b-18a85ba949a2",
  "template_title": "Launch card",
  "created_at": "2026-05-01T12:00:00Z"
}
```

`201` for a collection form. The body is a list of snap objects, one for each template of the form.

The output type, `image` or `pdf`, comes from the form. The render runs during the request. Each response carries an `X-Request-Uuid` header.

TODO(owner): The in-app API reference (`ApiSpec`) shows the template form response inside a `data` key, but `EmbeddedFormController` returns the snap object with no `data` key. Which shape is correct?

### Errors

| Status | Cause |
|---|---|
| `404` | The form does not exist, the signature is wrong, or the owner of the form is deactivated. |
| `422` | A collection form has no templates. The body is `{"message": "The form does not include any templates."}`. |

## Examples

```bash
curl -X POST 'https://snapsbrew.example/api/v1/embedded-forms/<formUuid>?signature=<sig>' \
  -H 'Accept: application/json' \
  -F 'layers[headline]=Summer sale' \
  -F 'layers[logo]=@logo.png'
```

```php
use Illuminate\Support\Facades\Http;

// Copy submit_signed_url from the form page. Do not build it by hand.
$submitUrl = config('services.snapsbrew.form_submit_url');

$snap = Http::acceptJson()
    ->timeout(90)
    ->attach('layers[logo]', file_get_contents('logo.png'), 'logo.png')
    ->post($submitUrl, [
        'layers[headline]' => 'Summer sale',
    ])
    ->throw()
    ->json();

$url = $snap['media_url'];
```

A browser can also post to the signed URL, because the request carries no secret token. The hosted form page at `/embedded-form/{formUuid}` does this.
