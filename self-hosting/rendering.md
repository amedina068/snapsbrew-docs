---
title: Rendering
description: Choose and tune the renderer, Browsershot or Browserless, and make sure that it can load fonts and images.
order: 4
---

# Rendering

Snapsbrew builds an HTML document for each snap. Headless Chrome opens this document and returns an image or a PDF. `RENDER_DRIVER` selects how the app reaches Chrome.

| Driver | How it works | Default in |
|---|---|---|
| `browsershot` | The app starts Node and Puppeteer for each render. Puppeteer connects to a warm Chrome, or starts a local Chrome. | The Docker image, `.env.example` and the config default |
| `browserless` | The app sends the HTML over HTTP to a Browserless service. One warm Chrome serves every render. | The `mysql` profile of `docker-compose.yml` |

The same driver also captures the screenshots of web pages. Read [Screenshots](../using-snapsbrew/screenshots.md).

## Browserless

The app sends a `POST` request to `/screenshot` or `/pdf` on `BROWSERLESS_URL`. The request holds the HTML, the canvas size and the output type. Browserless returns the raw bytes of the image or the PDF.

```dotenv
RENDER_DRIVER=browserless
BROWSERLESS_URL=http://browserless:3000
BROWSERLESS_TOKEN=<token>
BROWSERLESS_TIMEOUT=15
```

| Variable | What it does |
|---|---|
| `BROWSERLESS_URL` | The base URL of the service. In Docker it is `http://browserless:3000`. If the app runs on the same host outside Docker, use `http://127.0.0.1:3000`. |
| `BROWSERLESS_TOKEN` | The token. The app adds it to each request. |
| `BROWSERLESS_TIMEOUT` | The timeout of one request, in seconds. Default `15`. Read [Timeouts and queues](#timeouts-and-queues) before you change it. |

### Retries

The app tries each Browserless request up to 3 times. It waits 200 ms after the first failure and 400 ms after the second. After the third failure, the app writes a warning to the log and the snap gets the status `failed`. The app never stores an empty image.

### Run Browserless without the main stack

`deploy/browserless/docker-compose.yml` runs Browserless alone, for a server that runs the app without Docker:

```bash
export BROWSERLESS_TOKEN=$(openssl rand -hex 24)
docker compose -f deploy/browserless/docker-compose.yml up -d
curl "http://127.0.0.1:3000/json/version?token=$BROWSERLESS_TOKEN"
```

The last command makes sure that Chrome answers.

### Tune Browserless

These variables belong to the Browserless container, not to the app:

| Variable | In `docker-compose.yml` | In `deploy/browserless` | What it does |
|---|---|---|---|
| `CONCURRENT` | 5 | 10 | The number of renders at the same time. Keep it in line with the Horizon worker count. |
| `QUEUED` | 20 | 20 | The number of requests that wait for a free slot. |
| `TIMEOUT` | 15000 | 15000 | The limit of one render, in milliseconds. Keep it equal to `BROWSERLESS_TIMEOUT` of the app (in seconds). |
| `MAX_MEMORY_PERCENT` | not set | 80 | Browserless starts Chrome again above this memory use. |
| `MAX_CPU_PERCENT` | not set | 90 | The CPU limit of Browserless. |

Use a fixed image tag, for example `ghcr.io/browserless/chromium:v2.38.1`, and never `latest`. A new Browserless major version can change the `/screenshot` payload. Change the tag only together with the renderer code.

WARNING: Do not publish the Browserless port to the internet. The token is its only protection. A person with the token can control the browser and read files through `file://` URLs.

## Browsershot

### Browsershot in the Docker image

The Docker image runs a headless Chromium as a service in the container. Browsershot connects to it at `http://127.0.0.1:9222` (`BROWSERSHOT_INSTANCE`) and opens one tab for each render. The Chromium port listens inside the container only. With `RENDER_DRIVER=browserless`, this Chromium does not start.

The image also sets `RENDER_ASSET_URL=http://127.0.0.1:8080`. Chromium then loads the images and the fonts of the `public` disk from the web server in the container. This also works when `APP_URL` is a `localhost` URL.

### Browsershot without a warm Chrome

When `BROWSERSHOT_INSTANCE` is empty, Browsershot starts a new Chrome for each render. This is slower and uses more memory than a warm Chrome. It needs no extra service, so it is the default for local development.

```dotenv
RENDER_DRIVER=browsershot
BROWSERSHOT_NODE_PATH=/usr/local/bin/node
BROWSERSHOT_NPM_PATH=/usr/local/bin/npm
BROWSERSHOT_INSTANCE=
```

| Variable | What it does |
|---|---|
| `BROWSERSHOT_NODE_PATH` | The Node binary. Default `/usr/local/bin/node`. |
| `BROWSERSHOT_NPM_PATH` | The npm binary. Default `/usr/local/bin/npm`. |
| `BROWSERSHOT_INSTANCE` | A remote Chrome as `host:port`. Empty starts a local Chrome. |

`npm install` downloads a Chrome through Puppeteer. If Puppeteer did not download a Chrome, set the Puppeteer variable `PUPPETEER_EXECUTABLE_PATH` to the path of a local Chrome.

Image renders, PDF renders and screenshots use these three variables.

## Fonts

The HTML of a snap loads fonts in two ways:

- A `<link>` to `https://fonts.googleapis.com` for the Google Fonts that the layers use.
- An `@font-face` rule for each custom font of the company that a layer uses. The URL of the font file is a media URL of the instance.

Chrome must reach `fonts.googleapis.com` and the media URL of the instance. If Chrome cannot reach a font, the render uses a fallback font. Read [Fonts and media](../using-snapsbrew/fonts-and-media.md).

## Images and other assets

Chrome waits until the network is idle before it takes the image. Chrome loads each image from its URL, from the network of the renderer:

- An image on S3, Spaces, R2 or another public host works.
- An image on the `public` disk has a URL that starts with `APP_URL`. Chrome must reach `APP_URL`.

### Images on localhost

Browserless runs in its own container. Inside that container, `localhost` is the Browserless container itself. If `APP_URL` is `http://localhost:8080`, Browserless cannot load the images and the fonts of the instance. The render then shows empty images or fallback fonts.

To correct this, do one of these:

- Set `RENDER_ASSET_URL` to an address of the app that Browserless can reach. The MySQL block of the Compose stack sets `http://web:8080`.
- Use a public domain in `APP_URL`.
- Use a bucket for `MEDIA_DISK`. Read [Storage](storage.md).
- For local development, use `RENDER_DRIVER=browsershot`.

A self-signed certificate on the media URL has the same effect. Chrome in Browserless does not trust it.

## Timeouts and queues

- A sync render runs in the web request. The request waits until the renderer returns.
- An async render runs as a `ProcessSnap` job on the `renders` queue. Read [Queues and Horizon](queues-and-horizon.md).
- The Horizon supervisor has a job timeout of 60 seconds and 1 try. The `queue:work` worker of the Docker image uses the same values.
- The Browserless renderer tries a render 3 times. Each attempt waits `BROWSERLESS_TIMEOUT` seconds, and the pause between attempts is 0.2 and then 0.4 seconds.

Tune `BROWSERLESS_TIMEOUT` only. The default of 15 seconds puts the worst case at about 46 seconds, so the third attempt runs before Horizon stops the job at 60 seconds. A sync render in a web request also stays short.

If you raise `BROWSERLESS_TIMEOUT` above 19 seconds, the third attempt does not run before Horizon stops the job. Keep the `TIMEOUT` of the Browserless container equal to `BROWSERLESS_TIMEOUT`, in milliseconds.

## Output formats

- `type`: `image` or `pdf`.
- `format`: `png`, `jpeg` or `webp`. Default `png`.
- `transparent`: `true` renders without the white page background. It works with `png` and `webp`, not with `jpeg`.

The maximum canvas size is 4000 × 4000 pixels.
