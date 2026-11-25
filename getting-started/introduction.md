---
title: Introduction
description: What Snapsbrew renders, what you can do with it, the parts of an instance, the words that the docs use, and the license.
order: 1
---

# Introduction

Snapsbrew is a self-hosted Laravel app that renders images and PDFs from templates. A rendered image or PDF is a **snap**.

You design a template one time in the browser editor. Then you render it many times with new text, images, colors or QR codes.

## What you can do

- **Design templates.** The editor has text, image, shape, SVG pattern and QR code layers. It also has groups and custom fonts. Each publish freezes a template version.
- **Render from the REST API.** Render one snap, render a collection, or start a batch of up to 100 items. The API has sync and async modes, webhooks and idempotency keys.
- **Render from a signed URL.** Put a signed image URL in an `og:image` tag. The first request renders the image. Later requests read the cache.
- **Share an embedded form.** A person types values into a form, and the form renders a template with these values. The person needs no account.
- **Import a spreadsheet.** Upload a CSV or XLSX file and get one snap for each row.
- **Capture screenshots.** Capture a web page as an image.
- **Connect an AI agent.** Connect an agent (Claude, Cursor and others) to the MCP server. The agent can list templates, preview a snap, render the final image and export a creative package.
- **Read the usage log.** Each request and each render is in the usage log of the account. Rendering is not limited. The usage log is a history only.
- **Work in a team.** Invite people to your company. Two-factor authentication is available.

## How it works

Snapsbrew is a Laravel 13 app with a Vue 3 editor. The main parts are:

| Part | What it does |
|---|---|
| Web app | Serves the editor, the dashboard, the REST API, the MCP server and the docs pages of the instance. |
| Database | MySQL 8 in production. SQLite works for local development. |
| Redis and Horizon | Hold and run the queued jobs: async renders, batches, imports and mail. |
| Scheduler | Runs the cleanup and the repair commands on a timer. |
| Renderer | Headless Chrome. Snapsbrew sends the HTML of a snap to Chrome and stores the image that comes back. |
| Media storage | Holds the rendered images and the uploads, on the local disk or in an S3-compatible bucket. |

The renderer is [Browserless](https://www.browserless.io/) or Browsershot. Browserless is a pooled Chrome service. Browsershot starts a local Chrome through Node for each render. Read [Rendering](../self-hosting/rendering.md) for the details.

## Words that these docs use

| Word | Meaning |
|---|---|
| Instance | One installation of Snapsbrew. |
| Owner | The person who runs the instance. Only the owner can open `/admin` and `/horizon`. |
| Company | A group of users that share templates and snaps. |
| Template | A design with a canvas size and a list of layers. |
| Layer | One element of a template, for example a text, an image or a QR code. Each layer has a key. |
| Variant | A change to one layer for one render, for example new text for the `headline` layer. |
| Snap | A rendered image or PDF. |
| API token | A personal access token with the `api_requests` ability. The REST API and the MCP server accept it. |
| Usage log | The list of the requests and the renders of an account. |

## License

The app is free software under the [GNU Affero General Public License version 3](https://github.com/amedina068/snapsbrew/blob/main/LICENSE) (AGPL-3.0). If you change the app and let people use the changed app over a network, you must offer those people the source code of your changed version. The source code is at [github.com/amedina068/snapsbrew](https://github.com/amedina068/snapsbrew).

The SDKs use the MIT license.

## Next steps

- To install with Docker, read [Install with Docker](installation-docker.md).
- To install on a server without Docker, read [Install without Docker](installation-manual.md).
- To render your first image, read [Your first snap](first-snap.md).
