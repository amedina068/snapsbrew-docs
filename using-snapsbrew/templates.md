---
title: Templates
description: Create, resize, tag, publish and revert the templates that every snap renders from.
order: 1
---

# Templates

A template is a reusable design. It has a canvas size, a list of layers and an optional list of layer groups. Every snap renders from a template.

A template belongs to a company. All users of the company can open, edit and render it.

## Create a template

The web app creates a template as a copy of a starter template or of one of your templates.

1. Open **Templates**.
2. Open the page for a new template (`/templates/new`).
3. To show only one canvas size, select a size and click **Filter**.
4. Find the starting design and click **Use this**.

The app copies the design into your company and opens the new template. The instance gets six starter templates from a database migration.

To create a template from scratch, use the API or the MCP server:

- `POST /v1/templates`. Read [Templates API](../api/templates.md).
- The `create-template` MCP tool. Read [MCP tools reference](../mcp/tools-reference.md).

When an account registers, the app also copies the first starter template into the account.

## The template page

The page of a template (`/templates/{uuid}`) shows:

- The size preset, the dimensions, the number of layers and the number of snaps.
- A table of layers with the key, the type, the visibility and the position of each layer.
- The forms of the template.

The page also has these actions:

- **Edit details** opens the title and size form.
- **Clone template** makes a copy of the template.
- **Open editor** opens the layer editor. Read [The editor](editor.md).
- **Generate snap** opens a form that renders a snap. Read [Snaps](snaps.md).

## Canvas size

A template has a width and a height in pixels. The maximum for each side is 4000 pixels.

A size preset gives a width and a height for one platform and format. The app has 45 presets, for example `instagram_story` (1080x1920) and `open_graph` (1200x630). The presets cover Instagram, Facebook, X, LinkedIn, Threads, Pinterest, TikTok, YouTube, Snapchat, WhatsApp, web and email, display ads, and print.

`App\Support\TemplateSizes` holds the list of presets. The editor, the template filters, the API and the MCP tools all read this list. `GET /v1/templates/sizes` returns the full list with the aspect ratio and the safe margin of each preset.

If the dimensions of a template match no preset, the stored size is `custom`.

### Change the size

1. Open the template in the editor.
2. Open **Template settings**.
3. Select a **Preset**, or select **Custom** and type the **Width** and the **Height**.
4. Save the change.

A size change does not move or scale the layers. Each layer keeps its position and its size in pixels. If the new aspect ratio is different, move the layers in the editor.

When the width or the height changes, the app makes a new preview image of the template.

## Draft and published versions

Each template has a draft. Each edit in the editor, the API or the MCP server changes the draft.

A publish copies the draft into a new version. A version has a number (1, 2, 3, and more) and it does not change after the publish. The template then points to this version.

Renders read the published version:

- The REST API (`POST /v1/snaps` and batches)
- Signed URLs
- Embedded forms
- Spreadsheet imports
- The MCP render and preview tools

If a template has no published version, the renders read the draft.

After you edit a published template, the draft is different from the published version. `GET /v1/templates/{uuid}` and the `get-template-details` MCP tool then return `has_unpublished_edits: true`. The edit has no effect on new snaps until you publish it.

### Publish a template

1. Open the template in the editor.
2. Open **Version history**.
3. Click **Publish**.

A publish with no new edits creates no second version. It returns the version that is live.

You can also publish with `POST /v1/templates/{uuid}/publish` or the `publish-template` MCP tool.

### Revert to an earlier version

1. Open **Version history** in the editor.
2. Find the version.
3. Click **Revert**.
4. Accept the confirmation.

A revert does not delete data. The app first saves the current draft as a "draft snapshot" in the history. Then it copies the layers and the groups of the earlier version into the draft.

A revert changes only the draft. To render the reverted design, publish the template again.

The history lists each version with its number, its author, its date and a preview image. The live version shows the label **LIVE**. The app makes the preview image of a version in a queue job, so the image can show a short time after the publish.

## Find templates

The **Templates** page has these filters:

- A size preset.
- A search text. It matches the template title or a tag name.
- One or more tags.

## Tags

A tag is a label for templates. Tags belong to the company. A template can have many tags.

You can manage tags with the API:

- `GET /v1/tags` and `POST /v1/tags` list and create tags.
- `POST /v1/templates/{uuid}/tags` replaces the tags of a template.

Read [Tags API](../api/tags.md).

## Delete a template

1. Open the template page.
2. Click **Delete template**.
3. Confirm the delete in the browser dialog.

The API does the same with `DELETE /v1/templates/{uuid}`. Read [Templates API](../api/templates.md).

A delete also removes:

- The snaps of the template and their images.
- The versions of the template.
- The forms of the template.
- The link to each collection that holds the template. The collections stay.

The imports of the template stay as a record. You cannot undo a delete.

## Related pages

- [The editor](editor.md)
- [Layers and variants](layers-and-variants.md)
- [Collections and forms](collections-and-forms.md)
