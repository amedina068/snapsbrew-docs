# Snapsbrew documentation

This repository holds the documentation of [Snapsbrew](https://snapsbrew.com), a self-hosted app that renders images and PDFs from templates.

The marketing site renders these files at [snapsbrew.com/docs](https://snapsbrew.com/docs). Each Markdown file is one page. The folder of a file is the section of the page.

The code of the app is in a separate repository. The docs describe that code, and the check script compares the pages with it.

## Pages

### Getting started

- [Introduction](getting-started/introduction.md)
- [Install with Docker](getting-started/installation-docker.md)
- [Install without Docker](getting-started/installation-manual.md)
- [Your first snap](getting-started/first-snap.md)
- [Upgrading](getting-started/upgrading.md)
- [Release notes](getting-started/release-notes.md)

### Self-hosting

- [Configuration](self-hosting/configuration.md)
- [Reverse proxy and TLS](self-hosting/reverse-proxy-and-tls.md)
- [Storage](self-hosting/storage.md)
- [Rendering](self-hosting/rendering.md)
- [Queues and Horizon](self-hosting/queues-and-horizon.md)
- [Scheduler](self-hosting/scheduler.md)
- [Backups](self-hosting/backups.md)
- [Accounts and registration](self-hosting/accounts-and-registration.md)
- [Recover access](self-hosting/recover-access.md)
- [Security](self-hosting/security.md)
- [Troubleshooting](self-hosting/troubleshooting.md)

### Using Snapsbrew

- [Templates](using-snapsbrew/templates.md)
- [The editor](using-snapsbrew/editor.md)
- [Layers and variants](using-snapsbrew/layers-and-variants.md)
- [Snaps](using-snapsbrew/snaps.md)
- [Batches and imports](using-snapsbrew/batches.md)
- [Creative packages](using-snapsbrew/creative-packages.md)
- [Signed URLs](using-snapsbrew/signed-urls.md)
- [Embedded forms](using-snapsbrew/embedded-forms.md)
- [Collections and forms](using-snapsbrew/collections-and-forms.md)
- [Screenshots](using-snapsbrew/screenshots.md)
- [Fonts and media](using-snapsbrew/fonts-and-media.md)

### REST API

- [API overview](api/overview.md)
- [Authentication](api/authentication.md)
- [Guides](api/guides.md)
- [Templates](api/templates.md)
- [Editor documents](api/editor-documents.md)
- [Media](api/media.md)
- [Screenshots](api/screenshots.md)
- [Snaps](api/snaps.md)
- [Snap batches](api/snap-batches.md)
- [Preview](api/preview.md)
- [Tags](api/tags.md)
- [Embedded forms](api/embedded-forms.md)
- [Signed URLs](api/signed-urls.md)
- [Free tools](api/free-tools.md)
- [OpenAPI and Postman](api/openapi.md)

### SDKs

- [SDKs](sdks/overview.md)

### MCP server

- [MCP server](mcp/overview.md)
- [Connect Claude](mcp/connect-claude.md)
- [Connect Cursor and other clients](mcp/connect-cursor-and-others.md)
- [MCP tools reference](mcp/tools-reference.md)
- [OAuth for the MCP server](mcp/oauth.md)

### Contributing to the app

- [Architecture](contributing/architecture.md)
- [Development setup](contributing/development-setup.md)
- [Testing](contributing/testing.md)
- [Add a layer type](contributing/adding-a-layer-type.md)
- [Release process](contributing/release-process.md)

## Write a page

1. Put the page in the folder of its section.
2. Give the file a short name in kebab case, for example `signed-urls.md`.
3. Start the file with front matter.
4. Write the page in Simple English. Read [CONTRIBUTING.md](CONTRIBUTING.md).
5. Add the page to the list in this README.
6. Run the checks.

### Front matter

Each page starts with three fields:

```yaml
---
title: Signed URLs
description: Put a signed image URL in an img tag, and Snapsbrew renders the snap on the first request.
order: 7
---
```

| Field | What it does |
|---|---|
| `title` | The title of the page in the navigation and in the browser tab. |
| `description` | One sentence for the search results and the social cards. |
| `order` | An integer. It sets the position of the page in its section, from low to high. |

After the front matter, start the body with `# <title>`.

### Links

- Link to another page with a relative path and the `.md` extension, for example `[Storage](../self-hosting/storage.md)`.
- Link to a heading with its slug, for example `[Variants](layers-and-variants.md#variants)`.
- Use the example host `https://snapsbrew.example` in URLs of an instance.

## Run the checks

The check script needs Node 20 or later. It has no dependencies.

To check the front matter and the links only:

```bash
node scripts/check-docs.mjs
```

To also check the artisan commands, the environment variables and the API endpoints against the app, give the path of an app checkout:

```bash
SNAPSBREW_APP_PATH=../snapsbrew node scripts/check-docs.mjs
```

The script then makes sure that:

- each `php artisan <command>` in a page exists in the app,
- each environment variable in the code of a page exists in `.env.example`, `.env.docker.example`, `config/`, the Docker files or `deploy/` of the app,
- each `METHOD /path` on an API page (`api/*.md`) exists in `docs/api/openapi.yaml` of the app,
- each operation of `docs/api/openapi.yaml` is on an API page,
- each internal link and each anchor resolves.

The endpoint check reads a `METHOD /path` line in a fenced `http` block, inline code such as `` `POST /v1/snaps` ``, and a table row with the method and the path in two code cells. It compares the paths with the parameter names removed, so `{templateUuid}` and `{templateIdentifier}` are equal.

Two lists at the top of `scripts/check-docs.mjs` give the exceptions, each with a reason. The first list holds the paths that a page documents but the OpenAPI file leaves out on purpose, for example the free tools under `/v1/tools/`. The second list holds the operations that no page documents on purpose. The second list is empty now.

If the app checkout has no `docs/api/openapi.yaml`, the script writes a warning and skips the endpoint check. An older app checkout does not have this file.

If the app checkout has a `vendor/` folder, the script reads the command list from `php artisan list`. If not, it reads the command signatures in `app/Console/Commands`.

The CI runs the same script on each push and pull request. The CI clones the public app repository `amedina068/snapsbrew` and runs all the checks.

## Generate the MCP tools reference

`mcp/tools-reference.md` comes from the tool classes of the app. Do not edit it by hand. To make it again, run this command with an app checkout that has `vendor/`:

```bash
SNAPSBREW_APP_PATH=../snapsbrew php scripts/generate-mcp-tools-reference.php > mcp/tools-reference.md
```

## Open questions

A line that starts with `TODO(owner):` is a question for the maintainer. The code did not give the answer. To list the open questions, run:

```bash
grep -rn "TODO(owner):" --include=*.md .
```

## License

The pages of this repository are available under the [Creative Commons Attribution 4.0 International License](LICENSE) (CC BY 4.0). You can copy and change the pages if you give credit to Snapsbrew and link to the source.

The code examples in the pages and the files in `scripts/` are available under the [MIT License](LICENSE-CODE). You can use the examples in your own code, open source or closed source.
