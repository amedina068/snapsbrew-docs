---
title: OpenAPI and Postman
description: Where to get the OpenAPI file and the Postman collection, and how to import them into Postman, Insomnia and Bruno.
order: 15
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

The group slugs are `authentication`, `guides`, `templates`, `editor-documents`, `media`, `screenshots`, `snaps`, `snap-batches`, `preview`, `signed-urls`, `tags` and `embedded-forms`.

`ApiSpec` writes its examples with the host `https://snapsbrew.com`. Each export replaces that host with the value of `APP_URL`. Set `APP_URL` to the public URL of the instance, so that the exports name the correct server.

`/llms.txt` also links your privacy policy and terms pages when you set `SNAPSBREW_PRIVACY_URL` and `SNAPSBREW_TERMS_URL`. The reference shows a contact email from `SNAPSBREW_SUPPORT_EMAIL`. If that key is empty, it shows `MAIL_FROM_ADDRESS`.

## The files in the app repository

The app repository also holds three API files in `docs/api`. They come from `ApiSpec`, the same as the files that an instance serves.

| File | Content |
|---|---|
| `docs/api/openapi.yaml` | The OpenAPI 3.0.3 file. |
| `docs/api/postman_collection.json` | The Postman collection (v2.1), with one folder for each endpoint group. |
| `docs/api/postman_environment.json` | A Postman environment with the variables `baseUrl` and `token`. |

These files name the example instance `https://app.example.com`, not your instance. Use them when you have no instance yet, or when you want a fixed copy of the API.

Do not edit the files by hand. To write them again from `ApiSpec.php`, run this command in the app folder:

```bash
composer api-docs
```

The script runs `php artisan api:export`. The command needs Node 20 or later and access to the npm registry, because it runs the pinned `openapi-to-postmanv2` converter with `npx`. The CI of the app runs the same script and fails when the files in `docs/api` change.

### The variables

The collection and the environment use two variables:

| Variable | Value | Example |
|---|---|---|
| `baseUrl` | The root URL of your instance, with no `/api`. | `https://app.example.com` |
| `token` | Your API token. | `YOUR_API_TOKEN` |

Each request adds `/api` to `baseUrl`, for example `{{baseUrl}}/api/v1/snaps`. If you put `/api` in `baseUrl`, each request goes to `/api/api/...` and fails.

The signed URL request is the one exception. It goes to `{{baseUrl}}/signed-url/image.jpg` and sends no token. The embedded form request also sends no token.

The collection sends `token` as a bearer token on each other request. The environment marks `token` as a secret.

## Import into Postman

1. In Postman, click **Import**.
2. Select `postman_collection.json` and `postman_environment.json` together.
3. Click **Import**.
4. In the environment list at the top right, select the **Snapsbrew** environment.
5. Open the environment.
6. Set `baseUrl` to the root URL of your instance, for example `https://snapsbrew.example`.
7. Set `token` to your API token.
8. Save the environment.
9. Send **Authentication > Read the current token** to make sure that the token works.

The environment values replace the values of the collection variables. If you do not select the environment, each request goes to `https://app.example.com`.

## Import into Insomnia

1. In Insomnia, click **Import**.
2. Select `openapi.yaml`.
3. Import the file as a collection.
4. Open the environment of the new collection.
5. Change the base URL from `https://app.example.com/api` to the URL of your instance, followed by `/api`.
6. Set the bearer token to your API token.

When you import the OpenAPI file, the base URL comes from the `servers` entry of the file. That URL is `https://app.example.com/api`. It includes `/api`, so each path starts at `/v1`. The signed URL request has its own server entry, `https://app.example.com`, with no `/api`.

## Import into Bruno

Bruno can import the OpenAPI file or the Postman collection.

To import the OpenAPI file:

1. In Bruno, click **Import Collection**.
2. Select **OpenAPI V3 Spec**.
3. Select `openapi.yaml`.
4. Select a folder for the collection.
5. Change the base URL from `https://app.example.com/api` to the URL of your instance, followed by `/api`.
6. Set the bearer token of the collection to your API token.

To import the Postman collection:

1. In Bruno, click **Import Collection**.
2. Select **Postman Collection**.
3. Select `postman_collection.json`.
4. Select a folder for the collection.
5. Set the collection variable `baseUrl` to the root URL of your instance, with no `/api`.
6. Set the collection variable `token` to your API token.

## Download the files from an instance

An instance serves the OpenAPI file and a Postman collection for its own host:

```bash
curl -o snapsbrew-openapi.yaml https://snapsbrew.example/documentation/openapi.yaml
curl -o snapsbrew.postman_collection.json https://snapsbrew.example/documentation/postman-collection
```

The downloaded OpenAPI file comes from the same generator as `docs/api/openapi.yaml`. The configuration of the instance sets the server URL and the contact email. The server URL is `APP_URL` followed by `/api`.

The downloaded Postman collection comes from a different generator, `App\Support\ApiDocs\PostmanGenerator`. It is not the same file as `docs/api/postman_collection.json`:

- It names the server of the instance that served it.
- It has no environment file.
- It uses three collection variables: `base_url`, `site_url` and `token`.
- `base_url` is `APP_URL` followed by `/api`. `site_url` is the root URL, for the signed URL request.

To use the downloaded collection, import it into Postman. Then open the **Variables** tab of the collection and set `token` to your API token.

## Keep the docs in sync with the routes

If you add an endpoint to `routes/api.php`, add it to `ApiSpec` in the same change. The test `tests/Unit/RoutesToApiSpecTest.php` compares the routes with the spec. See [Architecture](../contributing/architecture.md).

The free tool endpoints are not in `ApiSpec`. See [Free tools](free-tools.md).
