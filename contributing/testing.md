---
title: Testing
description: Run the PHP tests, the code style check, the front-end build and the smoke tests of Snapsbrew.
order: 3
---

# Testing

A pull request must pass three checks: the PHP tests, the code style check and the front-end build. The CI runs the same checks. A pull request with a red check is not merged.

## Run the three checks

Run these commands in the folder of the app:

```bash
vendor/bin/phpunit
vendor/bin/pint --test
npm run build
```

To correct the code style, run `vendor/bin/pint` without `--test`.

## The PHP tests

The tests are in two suites:

| Suite | Folder |
| --- | --- |
| Unit | `tests/Unit` |
| Feature | `tests/Feature` |

The default test database is SQLite in memory. `phpunit.xml` sets `DB_CONNECTION=sqlite` and `DB_DATABASE=:memory:`.

To run one test class, give its path:

```bash
vendor/bin/phpunit tests/Unit/ApiSpecTest.php
```

### Rules for a test

- Write the test first when you add behavior.
- Name a test class `SomethingTest` and a test method `test_it_does_something`.
- Use the factories in `database/factories` and the `RefreshDatabase` trait.
- A test for a validation error sends `Accept: application/json`. It asserts the message, not only the field name.

### Tests that do not start Chrome

Tests bind `Tests\Support\FakeRenderer` to the renderer contract. The fake returns a small PNG and records the HTML that it received. A test can then assert on the markup. `tests/Support` also has `ThrowingRenderer` and `SelectivelyFailingRenderer` for failure paths.

### Tests that keep the surfaces in sync

Some tests fail when two surfaces of the app disagree:

| Test | What it checks |
| --- | --- |
| `Tests\Unit\RoutesToApiSpecTest` | Each API route has an entry in `ApiSpec`, and each entry has a route. |
| `Tests\Unit\EnvExampleTest` | `.env.example` lists each variable that the app code or a config file reads. |
| `McpToolNamesTest` | The tool names that the server sends are the names that the workflow and the docs use. |

If you add an endpoint, a variable or an MCP tool, update the matching source in the same change.

## Tests that need MySQL

Some queries behave differently on MySQL. A test that must run on MySQL uses the `Tests\Support\RequiresMysql` trait. On another database, the trait skips the test.

To run the tests on MySQL, create an empty schema. Then run:

```bash
DB_CONNECTION=mysql DB_DATABASE=<schema> vendor/bin/phpunit
```

If `REQUIRE_MYSQL_LEDGER_GATE` is `true`, a MySQL-only test fails instead of a skip when the database is not MySQL. The CI sets it in the MySQL job.

## The CI

`.github/workflows/ci.yml` in the app repository runs on each push to `main` or to an `upgrade/**` branch, and on each pull request. It has these jobs:

| Job | What it does |
| --- | --- |
| Frontend build | Runs `npm ci` and `npm run build` on Node 22. |
| Code style (Pint) | Runs `vendor/bin/pint --test` on PHP 8.3. |
| API files | Runs `composer api-docs`, then fails if `git diff` shows a change in `docs/api`. |
| PHP 8.3 and PHP 8.4 | Runs `php artisan migrate:fresh` on an empty SQLite file, then `vendor/bin/phpunit`, then `composer audit --no-dev`. |
| MySQL lane | Runs a list of MySQL-only tests against MySQL 8.4, and stores the evidence files as an artifact. |

The security audit is a hard gate. A security advisory for a production package fails the build.

## Smoke tests

The app has three smoke tests that run with Node. The CI does not run them.

| Command | What it tests |
| --- | --- |
| `npm run test:editor` | The editor in a real browser, through Puppeteer. The **Add layer** control gets keyboard focus, creates a text layer and keeps a changed value. |
| `npm run test:editor-v2-save` | The editor in a real browser, through Puppeteer. A save of a template with a v2 editor document shows the error message of the editor. |
| `npm run test:pwa` | The progressive web app files, with no browser. It checks `public/manifest.webmanifest`, the sizes of the icons and the offline behavior of the service worker. |

The two editor tests need a running instance. They read `EDITOR_BASE_URL`. If that variable is empty, they read `APP_URL` from `.env`. They create the user `editor-browser-smoke@example.test` in that instance.

The browser sandbox stays on by default. In a trusted local root container, set `EDITOR_BROWSER_NO_SANDBOX=1` to turn it off.

## Related pages

- [Development setup](development-setup.md)
- [Architecture](architecture.md)
- [Add a layer type](adding-a-layer-type.md)
