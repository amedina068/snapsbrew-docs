---
title: Layers and variants
description: The layer object, its properties, and the variants that change a layer for one snap.
order: 3
---

# Layers and variants

A layer is one element of a template, for example a background, a text block, an image, a QR code or a barcode. A variant changes one layer for one snap. The template does not change.

## The layer object

The API stores each layer as an object with three fields:

| Field | Required | Description |
|---|---|---|
| `key` | Yes | A unique, non-empty string in the template, for example `headline`. Variants find the layer by this key. |
| `type` | No | `qr_code` and `barcode` get special rendering. Any other type renders as a box with its properties. |
| `properties` | Yes | A list of `{ "name": <string>, "value": <mixed> }` objects. |

The app ignores a property name that it does not know. It does not refuse it.

```json
{
  "key": "headline",
  "properties": [
    { "name": "textContent", "value": "Summer Sale" },
    { "name": "positionX", "value": 80 },
    { "name": "positionY", "value": 120 },
    { "name": "fontFamily", "value": "Poppins" },
    { "name": "fontSize", "value": 72 },
    { "name": "fontColor", "value": "#ffffff" }
  ]
}
```

The editor adds the type `empty`, `image`, `text` or `svg` to the layers that it creates. Forms and spreadsheet imports read this type to select the input. Read [Collections and forms](collections-and-forms.md) and [Batches and imports](batches.md).

## Layer properties

`App\Support\LayerSchema` holds the list of property names that the renderer uses. `GET /v1/guides/layers` and the `describe-layers` MCP tool return the same list.

| Group | Properties |
|---|---|
| Content | `textContent` |
| Background | `backgroundType`, `backgroundColor`, `backgroundGradientColor`, `backgroundSvg`, `backgroundImage`, `backgroundSize` |
| Box and position | `width`, `height`, `positionX`, `positionY`, `zIndex`, `opacity`, `rotate`, `shadow` |
| Effects | `flipHorizontal`, `flipVertical`, `mixBlendMode`, `filterBlur`, `filterBrightness`, `filterContrast`, `filterSaturate`, `filterGrayscale` |
| Border | `borderStyle`, `borderWidth`, `borderColor`, `borderRadiusLeftTop`, `borderRadiusRightTop`, `borderRadiusRightBottom`, `borderRadiusLeftBottom` |
| Text | `fontFamily`, `fontSize`, `fontColor`, `lineHeight`, `textAlignment`, `autoResize` |
| QR code | `qrContent`, `qrContentType` |
| Barcode | `barcodeContent`, `barcodeFormat` |

Some value rules:

- Sizes and positions are numbers in pixels. `rotate` is in degrees. `opacity` is from 0 to 1.
- `backgroundType` is `color`, `linear`, `radial`, `image` or `svg`. Set it when you use `backgroundGradientColor` or `backgroundSvg`.
- `backgroundGradientColor` is an object. For `linear`, it has `degrees` and a list of `steps` with `color` and `percentage`. For `radial`, it has `from` and `to`.
- `backgroundSvg` is an object with `design` and `color`. The app has 90 pattern designs. An unknown design renders the `diagonalStripes` pattern.
- `backgroundImage` is a public `http` or `https` URL, or a `data:` URI. The app refuses internal, reserved and `file://` addresses.
- `fontFamily` is a Google Fonts family name or the family of a custom font of your company.
- If `autoResize` is `true`, the text shrinks to fit its box and the app ignores `fontSize`.
- `barcodeFormat` is `Code128`, `EAN-13` or `UPC-A`. The `barcodeContent` must be valid for the format. EAN-13 needs 12 or 13 digits. UPC-A needs 12 digits.

The renderer HTML-escapes the text of a text layer.

## Variants

A variant is an object with a `layer` key and one change. A list of variants goes with a snap request.

```json
[
  { "layer": "headline", "text": "Summer sale" },
  { "layer": "logo", "image_url": "https://example.com/logo.png" },
  { "layer": "backdrop", "background_color": "#ff5a36" },
  { "layer": "ticket", "qr_content": "https://example.com/rsvp" },
  { "layer": "code", "barcode_content": "5901234123457" },
  { "layer": "ribbon", "hidden": true }
]
```

| Property | Value | Applies to | Effect |
|---|---|---|---|
| `text` | String | Text layers | Replaces the text. |
| `image_url` | Public `http` or `https` URL | Image and background-image layers | Replaces the background image. |
| `background_color` | Color, for example `#1d4ed8` | Layers with a background | Replaces the background color. |
| `qr_content` | String | `qr_code` layers | Replaces the encoded content. |
| `barcode_content` | String, maximum 1000 characters | `barcode` layers | Replaces the encoded value. |
| `hidden` | Boolean | Any layer | If `true`, the render drops the layer. |

`App\Support\VariantProperties` holds this list. `GET /v1/guides/variant-properties` and the `list-variant-properties` MCP tool return it.

### Rules

- `App\Support\VariantRules` validates the variants on the REST API, the MCP server and signed URLs.
- An `image_url` must resolve to a public address. A private, loopback, link-local or reserved host gets a validation error.
- A `background_color` must be a valid CSS color.
- A variant for a key that the template does not have changes nothing.
- If two variants change the same property of one layer, the last one wins.

### Find the layer keys of a template

Use one of these:

- `GET /v1/templates/{uuid}`. Each layer has `layer`, `type` and `available_modifications`.
- The `get-template-details` MCP tool.
- The layer table on the template page.

The API reports these layer types: `image`, `text`, `empty`, `qr_code` and `barcode`.

## Hidden layers and groups

A layer can drop from the render in two ways:

- A variant with `"hidden": true`.
- The layer is in a group with the visibility flag off.

## Related pages

- [The editor](editor.md)
- [Snaps](snaps.md)
- [API guides](../api/guides.md)
