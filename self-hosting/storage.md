---
title: Storage
description: Choose where Snapsbrew stores the rendered images and the uploads, on the local disk or in an S3-compatible bucket.
order: 3
---

# Storage

Snapsbrew stores files with the Spatie Media Library. `MEDIA_DISK` selects the disk for the media files. The four supported values are `public`, `s3`, `spaces` and `r2`.

## What goes on the media disk

| Owner | Media collection | Content |
|---|---|---|
| Snap | `image` | The rendered image or PDF. |
| Snap | `html_content`, `html_head` | The HTML that the renderer received. |
| Template and template version | `preview` | The preview image of the template. |
| Screenshot | `image` | The captured page. |
| User | `imagesMedia` | The images that the user uploaded, from the API, the editor or an embedded form. |
| Font | `file` | A custom font file. |

Some files stay on the `local` disk (`storage/app`) and not on the media disk:

- The image assets of the v2 editor document (the `source` collection of an editor asset). The code keeps them private on purpose.
- The uploaded spreadsheets of the imports, in `storage/app/snap-imports/<template uuid>/`.
- The starter template files in `storage/app/templates/`.

The Passport keys and the logs also stay in `storage/`.

## The `public` disk

`public` is the default. It writes to `storage/app/public` and serves the files from `APP_URL/storage`.

The public URL needs the link `public/storage`. `php artisan snapsbrew:install --prepare` creates it when it is missing. The Docker `web` container runs this command at each start.

With Docker, the files are in the `storage` volume.

The URLs of the files start with `APP_URL`. The renderer must reach `APP_URL` to load these files. Read [Rendering](rendering.md).

## The `s3` disk

Use `s3` for Amazon S3 or another S3-compatible service.

```dotenv
MEDIA_DISK=s3
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=<bucket>
# AWS_URL=https://cdn.snapsbrew.example
# AWS_ENDPOINT=https://s3.example-provider.com
AWS_USE_PATH_STYLE_ENDPOINT=false
```

| Variable | What it does |
|---|---|
| `AWS_ACCESS_KEY_ID` | The access key. |
| `AWS_SECRET_ACCESS_KEY` | The secret key. |
| `AWS_DEFAULT_REGION` | The region. `.env.example` sets `us-east-1`. |
| `AWS_BUCKET` | The bucket name. |
| `AWS_URL` | The public base URL of the files, for example a CDN. |
| `AWS_ENDPOINT` | A custom endpoint for an S3-compatible service. |
| `AWS_USE_PATH_STYLE_ENDPOINT` | Uses path-style URLs. Some S3-compatible services need `true`. |

## The `spaces` disk

Use `spaces` for DigitalOcean Spaces.

```dotenv
MEDIA_DISK=spaces
DO_SPACES_KEY=<key>
DO_SPACES_SECRET=<secret>
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_REGION=nyc3
DO_SPACES_BUCKET=<bucket>
DO_SPACES_URL=https://<bucket>.nyc3.cdn.digitaloceanspaces.com
```

## The `r2` disk

Use `r2` for Cloudflare R2.

```dotenv
MEDIA_DISK=r2
CLOUDFLARE_R2_ACCESS_KEY_ID=<key>
CLOUDFLARE_R2_SECRET_ACCESS_KEY=<secret>
CLOUDFLARE_R2_BUCKET=<bucket>
CLOUDFLARE_R2_URL=https://media.snapsbrew.example
CLOUDFLARE_R2_ENDPOINT=https://<account id>.r2.cloudflarestorage.com
CLOUDFLARE_R2_USE_PATH_STYLE_ENDPOINT=false
```

The region of the `r2` disk is always `us-east-1`. `CLOUDFLARE_R2_URL` is the public URL of the bucket, for example a custom domain that serves it.

## Visibility

The `public`, `s3`, `spaces` and `r2` disks write each file with `public` visibility. A browser, an email client and the renderer read the files from their URLs without a token.

Make sure that the bucket accepts public reads, or that its public URL (`AWS_URL`, `DO_SPACES_URL` or `CLOUDFLARE_R2_URL`) serves the files.

The files of a creative package are an exception. The app serves them through signed URLs that expire. Read [Creative packages](../using-snapsbrew/creative-packages.md).

## Change the disk of an existing instance

`MEDIA_DISK` applies to new files. The media library keeps the disk name of each file in the `media` table, so the old files stay on the old disk.

TODO(owner): Is there a supported way to move the existing media from `public` to a bucket? If not, must an owner copy the files and update the `media.disk` column by hand?

## Image conversions

The media library makes conversions of some images, for example the thumbnails of the template previews. `QUEUE_CONVERSIONS_BY_DEFAULT=true` makes these conversions on the queue. `IMAGE_DRIVER` selects `gd` or `imagick`.
