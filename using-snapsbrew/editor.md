---
title: The editor
description: Add, arrange, group and save the layers of a template in the browser editor.
order: 2
---

# The editor

The editor is the browser tool that changes the layers of a template. It is a Vue 3 app at `/templates/{uuid}/editor`.

To open it, open a template and click **Open editor**.

## The parts of the editor

- **The top bar.** It has the title of the template, **Back to template** and the **Template settings** button.
- **The canvas.** It shows the design at the size of the template.
- **The Layers panel.** It lists the layers and the layer groups.
- **The layer sidebar.** It shows the properties of the selected layer. If no layer is selected, it shows "No layer selected".
- **Version history.** It has the **Publish** button and the list of versions.
- **Preflight results.** It shows the known problems of the draft.

## Add a layer

1. Click **Add layer**.
2. Select one of the layer types.

| Option | Layer type | Start state |
|---|---|---|
| Empty layer | `empty` | A blank layer for a solid color |
| Image layer | `image` | An image placeholder with a default size |
| Text layer | `text` | A text block with starter typography |
| QR code layer | `qr_code` | A space for QR data |
| Barcode layer | `barcode` | A Code128, EAN-13 or UPC-A barcode |
| SVG layer | `svg` | A patterned SVG background |

Each layer gets a key. A variant, a form field and a spreadsheet column find the layer by this key. Give each layer a clear key before you share the template. Read [Layers and variants](layers-and-variants.md).

## Change a layer

1. Select the layer on the canvas or in the **Layers** panel.
2. Change its properties in the layer sidebar.

The sidebar has these controls:

- Position, size, rotation and opacity.
- Background, border, corner radius and shadow.
- Blend mode, filters and flip.
- For a text layer: the text, the font, the font size, the color, the line height, the alignment and auto resize.

The position buttons align the layer to the canvas. **Fit to template** makes the layer the same size as the canvas.

The layer sidebar also has **Undo** and **Redo**.

## Manage layers

Each row in the **Layers** panel has these actions:

- **Hide layer** and **Show layer**.
- **Lock layer** and **Unlock layer**.
- **Duplicate layer**.
- **Delete layer**. The row asks you to confirm the delete.

The editor uses the `visible`, `locked` and `title` fields only in the browser. The API stores the `key`, the `type` and the `properties` of each layer.

## Layer groups

A group collects layers in the **Layers** panel. A group has a name and a visibility flag.

- To put a layer in a group, use **Move to…** on the layer.
- To take a layer out of a group, click **remove** next to the layer.
- To rename, hide, show, move or delete a group, use the buttons on the group row.

A layer with no group shows under **Ungrouped**.

If you hide a group, the render drops each layer of the group. This is the same result as the `hidden` variant on each layer.

## Save the draft

Click **Save**. The editor sends the title, the layers, the groups and the canvas size to `PATCH /api/v1/templates/{uuid}`.

If a barcode layer has an invalid value, the **Save** button is disabled. Correct the highlighted layer, then save.

If you leave the editor with unsaved edits, the **Unsaved changes** dialog opens. You can save before you leave.

A save changes only the draft. To make the draft render, publish it. Read [Templates](templates.md#draft-and-published-versions).

## Preflight

After each save, the editor reads `GET /api/v1/templates/{uuid}/document/preflight`. The **Preflight results** panel shows each known problem with a code, a JSON pointer and a message. If the panel shows "Ready to render.", the known checks pass.

The preflight finds known problems only. It does not make sure that the render looks correct.

## Images in the editor

An image layer reads its image from a public URL or from the media library. The **Media Library** dialog lists the images of your user and uploads new images. Read [Fonts and media](fonts-and-media.md).

## Fonts in the editor

The font list has Google Fonts families and the custom fonts of your company. The render loads a Google Fonts family from Google. It loads a custom font from your instance. Read [Fonts and media](fonts-and-media.md).

## Canvas size

**Template settings** opens the **Adjust canvas size** dialog. Select a **Preset**, or select **Custom** and type the **Width** and the **Height**. Read [Templates](templates.md#canvas-size).

## The editor document

The API and the MCP server can also change a template through the v2 editor document. This document holds the layers, the groups and the design properties. Every write sends the revision of the last read, and the server refuses a write on an old revision.

Read [Editor documents API](../api/editor-documents.md).

TODO(owner): Does the browser editor read and write the v2 editor document, or only the `layers` and `groups` fields? The save code sends `layers` and `groups` to `PATCH /api/v1/templates/{uuid}`.
