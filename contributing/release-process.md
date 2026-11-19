---
title: Release process
description: The release notes, the changelog, the version numbers, the pinned images and the rules for database changes of a Snapsbrew release.
order: 5
---

# Release process

This page lists the parts of a release that the code defines. The app repository does not define a full release procedure yet. The `TODO(owner):` lines are the open questions.

## Tags and the Docker image

A release is a git tag that starts with `v` and holds a semantic version, for example `v1.2.3`. A push of such a tag starts the `Docker image` workflow in `.github/workflows/docker-publish.yml`. The workflow does not read the branch of the tagged commit.

TODO(owner): Which branch do we tag?

The workflow builds the image for `linux/amd64` and `linux/arm64`. It pushes the image to the GitHub Container Registry as `ghcr.io/<owner>/snapsbrew`. The workflow sets these image tags:

| Git tag | Image tags |
| --- | --- |
| `v0.4.1` | `0.4.1`, `0.4`, `latest` |
| `v1.2.3` | `1.2.3`, `1.2`, `1`, `latest` |
| `v1.3.0-rc.1` | `1.3.0-rc.1` only. `latest` stays on the last stable release. |

A manual run of the workflow publishes the selected branch or tag. It gives the image tags `<branch>` and `sha-<commit>`.

`docker-compose.image.yml` runs the published image. An instance can also build the image from the source with `docker compose up -d --build`.

## Release notes

[Release notes](../getting-started/release-notes.md) in this docs repository holds the release notes. The app repository has no release notes file.

### In a pull request of the app

A pull request with a change that users can see has a `## Release note` section in its body. Write one or two short sentences. Tell the user what changed and what to do.

```markdown
## Release note

The template page has a Delete template button with a confirmation.
```

A pull request without a change for users has no `## Release note` section.

### When a release goes out

1. Collect the `## Release note` sections of the merged pull requests.
2. Open `getting-started/release-notes.md` in the docs repository.
3. Find the heading of the release date, for example `## November 18, 2026`. If it does not exist, add it above the other dates.
4. Add one bullet for each note. Copy the text of the note as it is.
5. Open a pull request in the docs repository.

### Rules

- Write plain text. You can put code, commands and names in backticks. Do not use Markdown links or HTML in a note.
- Write one change in each bullet.
- Keep the newest date first. Do not add a second heading for the same date.
- Do not change old notes.

## The changelog

The app repository keeps `CHANGELOG.md`. The file uses the Keep a Changelog format and Semantic Versioning. Each change goes under `[Unreleased]` until the release.

`CHANGELOG.md` lists the changes of each version of the code. The release notes page of the docs lists the changes that users can see, by date. A change for users goes in `CHANGELOG.md` and in the `## Release note` section of the pull request.

## Version numbers

The app has two version numbers in the code. Neither follows the git history.

| Version | Where | Current value |
| --- | --- | --- |
| API version | `ApiSpec::VERSION` in `app/Support/ApiDocs/ApiSpec.php` | `1.0.0` |
| MCP server version | `#[Version]` on `App\Mcp\Servers\SnapsbrewServer` | `1.0.0` |

The OpenAPI file and the docs index page at `/documentation` show the API version.

TODO(owner): When do we change `ApiSpec::VERSION` and the MCP server version? Do they follow semantic versioning?

### Breaking API changes

`ApiSpec` marks a breaking change with a note that starts with "BREAKING CHANGE". A deprecated field stays until a major version removes it. For example, `data.id` of the publish endpoint repeats `data.uuid` and stays until a major version.

## Pinned images

The Docker files pin each image to a version:

| Image | File | Version |
| --- | --- | --- |
| PHP runtime (serversideup) | `Dockerfile`, `PHP_IMAGE` argument | `serversideup/php:8.4-fpm-nginx-trixie-v5.1.2` |
| Node, for the asset build | `Dockerfile` | `node:22-trixie-slim` |
| MySQL | `docker-compose.yml` | `mysql:8.4` |
| Redis | `docker-compose.yml` | `redis:8-alpine` |
| Browserless | `docker-compose.yml` and `deploy/browserless/docker-compose.yml` | `ghcr.io/browserless/chromium:v2.38.1` |

CAUTION: Do not use the `latest` tag for Browserless. A major Browserless version can change the `/screenshot` payload. Then `BrowserlessRenderer` stops working. Change the Browserless tag and `App\Services\BrowserlessRenderer` in the same change.

## Database changes

The Docker `web` container runs the migrations each time that it starts. An update of an instance thus runs the new migrations automatically. Read [Upgrading](../getting-started/upgrading.md).

Each migration must obey these rules:

- A data migration runs on MySQL and on SQLite.
- Write a backfill as a `chunkById()` loop with one `UPDATE` for each row.
- If a pull request changes the database, the configuration or a public API, say so in its description.

The CI runs `php artisan migrate:fresh` on an empty SQLite database before the tests. The MySQL job runs the migrations on MySQL 8.4.

### Backfill commands

Some changes need a command after the migrations. The app has this backfill command for the v2 editor document:

```bash
php artisan editor:backfill-template-documents
```

It fills the empty v2 documents from the legacy template data. Its options are `--table` (`templates` or `template_versions`), `--after-id` and `--limit` (default `500`).

No migration fills the v2 documents, and a render does not need them. A template with no v2 document renders from `layers` and `groups`. The editor operations return `editor_operation_document_missing` for a template with no v2 document.

CAUTION: Do not tell instances to run the backfill while the browser editor saves only `layers` and `groups`. The command sets `editor_schema_version`, and then `PATCH /api/v1/templates/{uuid}` returns `409` with `legacy_edit_rejected_for_v2`. The browser editor cannot save these templates.

## Before a release

The code gives these checks:

1. Make sure that the CI is green on `main`.
2. Make sure that `ApiSpec` matches the routes. `Tests\Unit\RoutesToApiSpecTest` does this check.
3. Make sure that `.env.example` lists each new variable. `Tests\Unit\EnvExampleTest` does this check.
4. If an MCP tool changed, regenerate the [MCP tools reference](../mcp/tools-reference.md) in this docs repository.

To regenerate the tools reference, run this command in the docs repository:

```bash
SNAPSBREW_APP_PATH=/path/to/snapsbrew php scripts/generate-mcp-tools-reference.php > mcp/tools-reference.md
```

TODO(owner): Who approves a release, and which steps come after the CI is green?

## Related pages

- [Architecture](architecture.md)
- [Testing](testing.md)
- [Upgrading](../getting-started/upgrading.md)
