---
title: Add a layer type
description: The files that a new layer type touches, traced from the barcode layer, so that each surface of Snapsbrew knows the new type.
order: 4
---

# Add a layer type

A layer type changes how a layer renders. It also changes how the editor, the forms, the API and the MCP server show the layer. A new type must reach each surface in the same pull request.

This page lists the files that the `barcode` type touches. Use it as a checklist for a new type. The `qr_code` type touches almost the same files.

## How a layer type works

A layer has a `key`, an optional `type` and a list of `properties`. Each property has a `name` and a `value`.

`App\Support\LayerSchema::layerTypes()` returns the types that get special rendering: `qr_code` and `barcode`. A layer with another type, or with no type, renders as a box that its properties style.

A type can also have a variant property. A variant property lets a snap request change the content of the layer. For the `barcode` type, the variant property is `barcode_content`.

## Checklist

### 1. The layer vocabulary

| File | Change |
| --- | --- |
| `app/Support/LayerSchema.php` | Add the type to `layerTypes()`. Add each new design-time property to the property names and to the descriptions. `GET /api/v1/guides/layers` and the `describe-layers` MCP tool return this catalog. |
| `app/Rules/ValidLayers.php` | Add the validation for the new properties. For example, the barcode rule accepts only the formats `Code128`, `EAN-13` and `UPC-A`. |

### 2. The renderer

| File | Change |
| --- | --- |
| `app/Builders/LayerBuilder.php` | Add a branch in `buildContent()` for the type. Read the variant value in the same way as `qr_content` and `barcode_content`. Add a placeholder for a layer with no content. |

### 3. Variants

| File | Change |
| --- | --- |
| `app/Support/VariantRules.php` | Add the validation rule of the variant property. The REST API and the MCP server share these rules. |
| `app/Support/VariantProperties.php` | Add an entry with `property`, `value_type`, `applies_to`, `description` and `example`. `GET /api/v1/guides/variant-properties` and the `list-variant-properties` MCP tool return this catalog. |
| `app/Parsers/TemplateLayerParser.php` | Add the type to `parseLayer()`. The parser builds the `available_modifications` of a layer in the template responses of the API. |
| `app/Mcp/Tools/Concerns/InteractsWithSnaps.php` | Add the variant property to the `variants` schema of the MCP tools. |

TODO(owner): The `variants` schema in `InteractsWithSnaps` lists `qr_content` but not `barcode_content`, although `VariantRules` accepts it. Is this intentional?

### 4. Forms

| File | Change |
| --- | --- |
| `app/Builders/FormLayerBuilder.php` | Add a constant for the type and the default value of the form field. |
| `app/Http/Controllers/Api/V1/EmbeddedFormController.php` | Add the type to the two maps from a layer type to a value key. For example, `barcode` maps to `barcode_content`. |
| `resources/js/components/EmbeddedForm.vue` | Add the input for the type, and add the type to the list of editable layers. |

### 5. The editor

| File | Change |
| --- | --- |
| `resources/js/components/AddLayerActions.vue` | Add the entry in the **Add layer** menu, with the default properties of a new layer. |
| `resources/js/LayersImporter.js` | Add the default properties of the type. Add the rule that finds the type from its properties when a layer has no type. |
| `resources/js/components/LayerPropertiesSettings.vue` | Add the property panels of the type. For example, `PropertyBarcode.vue` is the panel of the barcode type. |
| `resources/js/components/LayerPropertiesReadOnly.vue` | Add the read-only panels of the type, if the type needs them. |
| `resources/js/components/LayerBlock.vue` | Add the summary of the layer in the layer list. |
| `resources/js/store/index.js` and `resources/js/components/TemplateActions.vue` | If the content of the type can be invalid, mark the layer as invalid. The editor does not save a template with an invalid layer. |

The `CONTRIBUTING.md` file of the app repository says that a new Vue component must be registered in `resources/js/app.js`. `PropertyBarcode.vue` is imported in `LayerPropertiesSettings.vue` instead.

TODO(owner): Does the registration rule apply to a property panel that another component imports? `PropertyBarcode.vue` is not registered in `resources/js/app.js`.

### 6. The v2 editor document

| File | Change |
| --- | --- |
| `app/Editor/EditorDocumentOperationApplier.php` | Add the type to `TYPES`. The `set_layer_type` operation accepts only these types. |
| `app/Support/EditorDocumentContract.php` | Add the constraints of the new properties. `GET /api/v1/guides/editor-document` and the `describe-editor-document` MCP tool return this contract. |
| `app/Services/EditorPreflight.php` | If the type has a known draft problem, add a check with a code, a JSON pointer and a message. |

### 7. The API spec

| File | Change |
| --- | --- |
| `app/Support/ApiDocs/ApiSpec.php` | Add the type to the `Layer` schema. Add the variant property to the `variants` parameter of the preview endpoints. Add the value key to the embedded forms endpoint. |

### 8. Guides

| File | Change |
| --- | --- |
| `app/Support/DesignGuide.php` | If the type changes the layer order or a composition recipe, update the guide. |

### 9. Tests

Write the tests first. These test files cover the barcode type:

- `tests/Unit/Builders/LayerBuilderTest.php`: the render and the placeholder
- `tests/Unit/Rules/ValidLayersTest.php`: the validation of the properties

Also run the tests that compare the surfaces. Read [Testing](testing.md).

## Make sure that the type works

1. Add a layer of the new type in the editor.
2. Publish the template.
3. Preview a snap with the variant property. Use `GET /api/v1/snaps/preview`.
4. Create a snap with the same variant through `POST /api/v1/snaps`.
5. Create a form for the template and submit a value.
6. Call `describe-layers` and `list-variant-properties` through the MCP server.
7. Make sure that both tools show the new type.

## Related pages

- [Architecture](architecture.md)
- [Testing](testing.md)
- [Layers and variants](../using-snapsbrew/layers-and-variants.md)
