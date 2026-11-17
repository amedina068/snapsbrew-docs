---
title: Screenshots
description: Capture a public web page as a PNG image from the web app or the API.
order: 10
---

# Screenshots

A screenshot is a PNG image of a public web page. Screenshots do not use templates. They belong to the company of the user who made them.

## Take a screenshot in the web app

1. Open **Screenshots** in the top menu.
2. Click **New screenshot**.
3. Type the **URL** of the page.
4. Type the **Width** and the **Height** of the browser window in pixels.
5. Click **Submit**.

The app captures the page in the request. Then it opens the page of the new screenshot.

## Take a screenshot with the API

`POST /v1/screenshots` captures a page. `GET /v1/screenshots` and `GET /v1/screenshots/{uuid}` read your screenshots.

| Field | Default | Description |
|---|---|---|
| `url` | | The page to capture. |
| `width` | 1330 | The width of the browser window in pixels. |
| `height` | 780 | The height of the browser window in pixels. |

```bash
curl -X POST https://snapsbrew.example/api/v1/screenshots \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com","width":1330,"height":780}'
```

The full request and response are in [Screenshots API](../api/screenshots.md).

## How the capture works

- The browser opens the URL with the window size that you give.
- The device scale factor is 2. The image has two times the pixels of the window size.
- The browser waits until the network is idle. Then it captures the page.
- The image format is PNG.

The renderer that captures the page is the same renderer that renders snaps. `RENDER_DRIVER` selects it:

- `browserless` sends the URL to the Browserless service.
- `browsershot` starts a local Chrome through Node and Puppeteer.

With the `browsershot` driver, `BROWSERSHOT_INSTANCE` can name a remote Chrome as `host:port`. If it is empty, the app starts a local Chrome. The `browserless` driver does not read this variable.

Read [Rendering](../self-hosting/rendering.md).

## URL rules

The URL must be an `http` or `https` URL. Each address of its host must be public. The app refuses a host that resolves to a private, loopback, link-local or reserved range. This range includes the cloud metadata address `169.254.169.254`.

This check runs before the capture. The browser resolves the host again when it loads the page. A firewall on the render host gives more protection.

## The free screenshot endpoint

`POST /api/v1/tools/screenshot-creator` takes no token. It returns `404` until `SNAPSBREW_FREE_TOOLS_ENABLED` is `true`. It stores each screenshot under the user that `SNAPSBREW_FREE_TOOLS_USER_ID` names. Read [Free tools API](../api/free-tools.md).

## Related pages

- [Screenshots API](../api/screenshots.md)
- [Rendering](../self-hosting/rendering.md)
