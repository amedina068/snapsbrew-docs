---
title: Fonts and media
description: Upload custom fonts for your company and images for your media library.
order: 11
---

# Fonts and media

A template can use Google Fonts, the custom fonts of your company and the images in your media library.

## Google Fonts

A text layer can name any Google Fonts family in `fontFamily`. The render page loads the family from Google Fonts.

The renderer must reach `fonts.googleapis.com` to load these fonts. Read [Rendering](../self-hosting/rendering.md).

## Custom fonts

A custom font belongs to the company. All users of the company can use it.

### Upload a font

1. In the top menu, click **Fonts**. The **Custom fonts** page opens.
2. Type a **Display name**.
3. Type the **CSS family name**.
4. Select the **Font file**.
5. Click **Upload font**.

The upload has these rules:

- The file is OTF, TTF, WOFF or WOFF2.
- The maximum file size is 5 MB.
- The app reads the first bytes of the file. They must match a font format, and the format must match the file extension.
- The family name has 1 to 100 characters: letters, digits, spaces, hyphens and underscores.
- The family name is unique in the company.
- A company can have a maximum of 25 fonts.

The app stores the file under a random name. It does not use the name of the uploaded file.

### Use a font

1. Open a template in the editor.
2. Select a text layer.
3. In the font list, select the custom font.

The editor reads the custom fonts of your company from `/fonts/list`.

At render time, the app adds a `@font-face` rule for each custom font that a layer of the template uses. The font file URL is a URL of your instance. The renderer must reach this URL. Read [Rendering](../self-hosting/rendering.md).

### Delete a font

1. Open the **Custom fonts** page.
2. Click **Delete** on the font.

If a template still uses the font, the app does not delete it. It shows the templates that use the font. If you click **Delete anyway**, the app deletes the font. These templates then render with a default font.

The **Custom fonts** page shows the number of templates that use each font.

## The media library

The media library holds images for image layers. Each user has a separate media library.

### Upload an image in the editor

1. Select an image layer.
2. Open the **Media Library** dialog.
3. Upload an image, or select an image that you uploaded before.

### Upload an image with the API

`POST /v1/media` uploads one image as `multipart/form-data`. The field is `file`. The file must be an image.

```bash
curl -X POST https://snapsbrew.example/api/v1/media \
  -H 'Authorization: Bearer <your-token>' \
  -F 'file=@logo.png'
```

`GET /v1/media` lists your images, 12 for each page, newest first. Each item has `id`, `file_name` and `src`. Use `src` as an `image_url` variant or as the `backgroundImage` of a layer.

Read [Media API](../api/media.md).

### Limits

The media library refuses a file larger than 10 MB. This is the `max_file_size` value in `config/media-library.php`.

### Images from embedded forms

When a person uploads an image in an embedded form, the image goes into the media library of the form owner. Read [Embedded forms](embedded-forms.md).

## Where the files go

Fonts, media and rendered snaps go to the disk that `MEDIA_DISK` names. The default is `public`. Read [Storage](../self-hosting/storage.md).

## Related pages

- [The editor](editor.md)
- [Layers and variants](layers-and-variants.md)
- [Storage](../self-hosting/storage.md)
