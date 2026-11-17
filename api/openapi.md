---
title: OpenAPI and Postman
description: Where an instance serves its API reference, the OpenAPI file, the Postman collection and the Markdown exports.
order: 14
---

# OpenAPI and Postman

Each instance serves its own API reference. One PHP class, `App\Support\ApiDocs\ApiSpec`, holds the API description. The instance builds each format from it on each request.

## What the instance serves

The pages are public. They need no sign-in.

| Path | Content |
|---|---|
| `/documentation` | The start page of the API reference. |
| `/documentation/api-reference` | The full reference with each object schema. |
| `/documentation/{slug}` | One endpoint group, for example `/documentation/snaps`. |
| `/documentation/rate-limit` | A page about rate limits. |
| `/documentation/troubleshooting` | A page about the `X-Request-Uuid` header. |
| `/documentation/guides/mcp` | A guide to the MCP server. |
| `/documentation/guides/signed-urls` | A guide to signed URLs. |
| `/documentation/guides/embedded-forms` | A guide to embedded forms. |
| `/documentation/openapi.yaml` | The OpenAPI 3.0.3 file, as a download. |
| `/documentation/postman-collection` | The Postman collection, as a download. |
| `/documentation/{slug}.md` | One endpoint group as Markdown. |
| `/documentation/reference.md` | The full reference as one Markdown file. `/documentation/full.md` returns the same file. |
| `/llms.txt` | A link list for language models. |
| `/skill.md` | The MCP agent workflow as an Agent Skill file. |

The group slugs are `authentication`, `guides`, `templates`, `editor-documents`, `media`, `screenshots`, `snaps`, `snap-batches`, `preview`, `tags` and `embedded-forms`.

`ApiSpec` writes its examples with the host `https://snapsbrew.com`. Each export replaces that host with the value of `APP_URL`. Set `APP_URL` to the public URL of the instance, so that the exports name the correct server.

`/llms.txt` also links your privacy policy and terms pages when you set `SNAPSBREW_PRIVACY_URL` and `SNAPSBREW_TERMS_URL`. The reference shows a contact email from `SNAPSBREW_SUPPORT_EMAIL`. If that key is empty, it shows `MAIL_FROM_ADDRESS`.

## Download the OpenAPI file

```bash
curl -o snapsbrew-openapi.yaml https://snapsbrew.example/documentation/openapi.yaml
```

The file declares a bearer security scheme for the API token. The server URL is `APP_URL` followed by `/api`.

You can give the file to a code generator or to an API client that reads OpenAPI.

## Import the Postman collection

1. Download the collection:

   ```bash
   curl -o snapsbrew.postman_collection.json https://snapsbrew.example/documentation/postman-collection
   ```

2. In Postman, click **Import**.
3. Select the downloaded file.
4. Open the collection, then open the **Variables** tab.
5. Set `token` to your API token.
6. If the host is not correct, set `base_url` to `https://snapsbrew.example/api`.

The collection uses two variables. `base_url` starts as `APP_URL` followed by `/api`. `token` starts as a placeholder value. Each request sends `token` as a bearer token.

## Keep the docs in sync with the routes

If you add an endpoint to `routes/api.php`, add it to `ApiSpec` in the same change. The test `tests/Unit/RoutesToApiSpecTest.php` compares the routes with the spec. See [Architecture](../contributing/architecture.md).

The free tool endpoints are not in `ApiSpec`. See [Free tools](free-tools.md).
