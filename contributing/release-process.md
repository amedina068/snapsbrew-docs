---
title: Release process
description: The version numbers, the pinned images and the rules for database changes that a Snapsbrew release depends on.
order: 5
---

# Release process

This page lists the parts of a release that the code defines. The app repository does not define a full release procedure yet. The `TODO(owner):` lines are the open questions.

TODO(owner): Do we tag releases in git? If yes, what is the tag format, and which branch do we tag?

TODO(owner): Do we keep a changelog or GitHub release notes? Where?

TODO(owner): Do we publish a Docker image to a registry, or does each instance build the image from the source with `docker compose up -d --build`?

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

TODO(owner): Must an instance run `php artisan editor:backfill-template-documents` after an update? If yes, in which release, and do we document it in the upgrade notes?

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
