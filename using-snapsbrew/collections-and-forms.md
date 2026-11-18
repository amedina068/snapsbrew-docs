---
title: Collections and forms
description: Group templates in a collection, and create forms for one template or for a whole collection.
order: 9
---

# Collections and forms

A collection is a group of templates in one company. A form exposes some layers of a template, or of each template in a collection, to a person who fills in values.

## Collections

A collection has a name and a list of templates. A template can be in more than one collection. Collections belong to the company. All users of the company see them.

A collection has two uses:

- A collection form renders one snap for each template in the collection.
- `POST /v1/snaps` with a `collection_id` renders one snap for each template in the collection. Read [Snaps API](../api/snaps.md).

### Create a collection

1. Open **Collections** in the top menu.
2. Click **Add new**.
3. Type a **Title**.
4. Optional: select the templates to include.
5. Click **Create**.

### Add templates to a collection

1. Open the collection.
2. Click **Add template**.
3. Select one or more templates.
4. Click **Add templates**.

A template that is already in the collection stays in the collection one time.

### Remove a template from a collection

1. Open the collection.
2. On the card of the template, click **Remove from collection**.
3. Confirm in the browser dialog.

The template stays in your templates. Only the link to the collection goes.

### Delete a collection

1. Open the collection.
2. Click **Delete collection**.
3. Confirm in the browser dialog.

A delete also removes the forms of the collection, because a collection form renders every template of the collection. The templates stay. You cannot undo a delete.

### Find a collection

The **Template Collections** page has a search field. The search matches the collection name, a template title or a tag name.

The page of a collection shows its templates, up to six forms and the nine latest snaps of its templates.

## Forms

A form belongs to one template or to one collection. It has a title, a list of selected layers and an output type: **Image** or **PDF**.

A form needs at least one layer. If the template has no layers, the app shows "Add at least one layer to enable forms".

### Create a form for a template

1. Open the template.
2. In the **Forms** panel, open the list of forms.
3. Click **New form**.
4. Type a **Title**.
5. Select the **Layers** that a person can change.
6. Select the **Format**: **Image** or **PDF**.
7. Submit the form.

A layer that you do not select keeps the template value.

### Create a form for a collection

1. Open the collection.
2. In the **Forms** section, click **Add form**.
3. Type a **Title**.
4. For each template, select the layers that a person can change.
5. Select the **Format**.
6. Submit the form.

At least one layer in the collection must be selected.

### The form page

The form page shows:

- **Embedded form link**. Share this link or put it in an `<iframe>`. Read [Embedded forms](embedded-forms.md).
- **Submit link**. Send the layer values to this URL to use your own form. Read [Embedded forms](embedded-forms.md).
- **Form layers**. Each selected layer with its type and its default value.
- **Form snaps**. The snaps that the form made, with the date and the image URL.

### Edit a form

Click **Edit** on the form page. You can change the title, the selected layers and the format. The form links do not change.

The web app has no action that deletes a form.

## How a form renders

- A form renders the published version of each template. Read [Templates](templates.md#draft-and-published-versions).
- The render runs in the request and does not use the queue.
- Each render writes a row in the usage log of the form owner.

## Related pages

- [Embedded forms](embedded-forms.md)
- [Templates](templates.md)
- [Snaps](snaps.md)
