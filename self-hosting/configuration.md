---
title: Configuration
description: Every environment variable of Snapsbrew, in groups, with its default value.
order: 1
---

# Configuration

Snapsbrew reads its settings from environment variables. Put them in the `.env` file in the root of the app.

- For a server or a local install, start from `.env.example`.
- For Docker, start from `.env.docker.example`. Every variable of `.env.example` also works there.

After you change `.env` on a server that caches the configuration, run `php artisan config:cache` again. With Docker, restart the containers: `docker compose up -d`.

## How to read the tables

- **Default** is the value that the app uses when the variable is not set. It comes from the files in `config/`.
- **Example** is the value in `.env.example`. An empty cell means that the variable is not in `.env.example`, or that it is empty there.
- With Docker, `docker-compose.yml` sets some variables itself. Read [Install with Docker](../getting-started/installation-docker.md).

## App

| Variable | Default | Example | What it does |
|---|---|---|---|
| `APP_NAME` | `Laravel` | `Snapsbrew` | The name of the app in the UI, the emails and the API docs. It is also part of the default cache, Redis and Horizon prefixes. |
| `APP_ENV` | `production` | `production` | The environment. Horizon uses 10 worker processes in `production` and 3 in `local`. Another value starts no Horizon worker. |
| `APP_KEY` | none | none | The encryption key. Make it with `php artisan key:generate`. The setup token and the stored signed-URL keys depend on it. |
| `APP_DEBUG` | `false` | `false` | Shows the error details in the browser. Set `true` only for local development. |
| `APP_URL` | `http://localhost` | `http://localhost:8000` | The public URL of the instance. Links, the API docs, the signed URLs and the URLs of the `public` disk use it. |
| `APP_PREVIOUS_URLS` | empty | empty | Earlier hosts of the instance, comma separated. Embedded form URLs that the app signed on one of these hosts keep working. |
| `APP_PORT` | `8080` | | Docker only. The host port of the `web` container. It is in `.env.docker.example`. |
| `APP_BIND` | `127.0.0.1` | | Docker only. The host interface of `APP_PORT`. `0.0.0.0` takes traffic from other hosts. |
| `ASSET_URL` | none | | A different host for the front-end assets. |
| `TRUSTED_PROXIES` | none | commented out | The IP addresses and CIDR ranges of the proxies that the app trusts for the `X-Forwarded-*` headers, comma separated. Do not set `*`. Read [Trusted proxies](reverse-proxy-and-tls.md#trusted-proxies). |
| `BCRYPT_ROUNDS` | `10` | | The cost of the password hash. |

## Accounts and instance

| Variable | Default | Example | What it does |
|---|---|---|---|
| `REGISTRATION_ENABLED` | `false` | `false` | The default registration mode. `false` is invite only and `true` is open. The mode that the owner sets in **Admin > Settings** wins. |
| `SNAPSBREW_PREVIEW_WATERMARK` | `true` | `true` | Shows a "PREVIEW" overlay on the previews of the REST API and the MCP server. A final render never shows it. |
| `SNAPSBREW_SUPPORT_EMAIL` | none | empty | The email that the API docs show. If it is empty, the docs show `MAIL_FROM_ADDRESS`. |
| `SNAPSBREW_PRIVACY_URL` | none | empty | Your privacy policy. `llms.txt` links it when it is set. |
| `SNAPSBREW_TERMS_URL` | none | empty | Your terms of service. `llms.txt` links it when it is set. |
| `SNAPSBREW_INVITATIONS_PER_COMPANY_PER_DAY` | `20` | `20` | The maximum number of invitation emails that one company can send in 24 hours. |

The app ships no privacy policy and no terms of service. If your instance is public, write your own pages.

## Database

| Variable | Default | Example | What it does |
|---|---|---|---|
| `DB_CONNECTION` | `mysql` | `sqlite` | The database driver. Production uses MySQL 8. |
| `DB_HOST` | `127.0.0.1` | commented out | The database host. |
| `DB_PORT` | `3306` | commented out | The database port. |
| `DB_DATABASE` | `forge` (`database/database.sqlite` for SQLite) | commented out | The database name, or the SQLite file. |
| `DB_USERNAME` | `forge` | commented out | The database user. |
| `DB_PASSWORD` | empty | commented out | The database password. |
| `DB_ROOT_PASSWORD` | none | | Docker only. The MySQL root password of the `mysql` container. |
| `DB_SOCKET` | empty | | A MySQL Unix socket. |
| `DB_FOREIGN_KEYS` | `true` | | Turns on the foreign keys of SQLite. |
| `DATABASE_URL` | none | | A full database URL instead of the separate values. |
| `MYSQL_ATTR_SSL_CA` | none | | The CA file for a TLS connection to MySQL. |

## Cache, sessions and Redis

| Variable | Default | Example | What it does |
|---|---|---|---|
| `CACHE_DRIVER` | `file` | `file` | The cache store. Docker sets `redis`. |
| `CACHE_PREFIX` | `<app name>_cache` | commented out | The prefix of the cache keys. |
| `SESSION_DRIVER` | `file` | `file` | The session store. Docker sets `redis`. |
| `SESSION_LIFETIME` | `120` | `120` | The session lifetime in minutes. |
| `SESSION_CONNECTION` | none | | The connection for the `database` or `redis` session driver. |
| `SESSION_STORE` | none | | The cache store for a cache-based session driver. |
| `SESSION_DOMAIN` | none | | The domain of the session cookie. |
| `SESSION_SECURE_COOKIE` | `true` when `APP_URL` starts with `https://` | commented out | Sends the session cookie only over HTTPS when it is `true`. |
| `REDIS_HOST` | `127.0.0.1` | `127.0.0.1` | The Redis host. |
| `REDIS_PASSWORD` | none | `null` | The Redis password. |
| `REDIS_PORT` | `6379` | `6379` | The Redis port. |
| `REDIS_PREFIX` | `<app name>_database_` | commented out | The prefix of the Redis keys. |
| `REDIS_CLIENT` | `phpredis` | | The PHP Redis client. |
| `REDIS_CLUSTER` | `redis` | | The cluster mode of the Redis client. |
| `REDIS_URL` | none | | A full Redis URL. |
| `REDIS_DB` | `0` | | The Redis database for the default connection. |
| `REDIS_CACHE_DB` | `1` | | The Redis database for the cache. |

In the prefixes, `<app name>` is `APP_NAME` in lowercase, with `_` between the words.

## Queues and Horizon

| Variable | Default | Example | What it does |
|---|---|---|---|
| `QUEUE_CONNECTION` | `sync` | `sync` | The queue driver. `sync` renders in the request. Use `redis` with Horizon on a server. Docker sets `redis`. |
| `REDIS_QUEUE` | `default` | | The default queue name of the `redis` connection. |
| `QUEUE_FAILED_DRIVER` | `database-uuids` | | Where the failed jobs go. |
| `HORIZON_PREFIX` | `<app name>_horizon:` | `snapsbrew_horizon:` | The prefix of the Horizon keys in Redis. |
| `HORIZON_NAME` | none | commented out | A name that Horizon shows in its notifications. |
| `HORIZON_DOMAIN` | none | commented out | A separate domain for the Horizon dashboard. |
| `HORIZON_PATH` | `horizon` | `horizon` | The path of the Horizon dashboard. |
| `HORIZON_MAX_PROCESSES` | 10 in `production`, 3 in `local` | commented out | The number of Horizon workers. Keep it in line with the `CONCURRENT` value of Browserless. |

Read [Queues and Horizon](queues-and-horizon.md).

## Mail

| Variable | Default | Example | What it does |
|---|---|---|---|
| `MAIL_MAILER` | `smtp` | `log` | The mail driver. `log` writes each email to the log. |
| `MAIL_HOST` | `smtp.mailgun.org` | `127.0.0.1` | The SMTP host. |
| `MAIL_PORT` | `587` | `1025` | The SMTP port. |
| `MAIL_USERNAME` | none | `null` | The SMTP user. |
| `MAIL_PASSWORD` | none | `null` | The SMTP password. |
| `MAIL_ENCRYPTION` | `tls` | `null` | The SMTP encryption. |
| `MAIL_FROM_ADDRESS` | none | `hello@example.com` | The sender address. |
| `MAIL_FROM_NAME` | none | `${APP_NAME}` | The sender name. |
| `MAIL_LOG_CHANNEL` | none | | The log channel for the `log` mailer. |
| `AWS_SES_ACCESS_KEY_ID` | `AWS_ACCESS_KEY_ID` | empty | The key for Amazon SES. Set `MAIL_MAILER=ses` or `ses-v2`. |
| `AWS_SES_SECRET_ACCESS_KEY` | `AWS_SECRET_ACCESS_KEY` | empty | The secret for Amazon SES. |
| `AWS_SES_REGION` | `AWS_DEFAULT_REGION`, then `us-east-1` | empty | The region for Amazon SES. |
| `AWS_SES_CONFIGURATION_SET` | none | empty | An SES configuration set. |
| `AWS_SESSION_TOKEN` | none | | A session token for SES. |

If no SES key and no AWS key is set, the AWS SDK reads its default credential chain, for example an instance role.

Without a working mailer, the "forgot password" email does not arrive. Read [Recover access](recover-access.md).

## Media storage

| Variable | Default | Example | What it does |
|---|---|---|---|
| `MEDIA_DISK` | `public` | `public` | Where the rendered images and the uploads go: `public`, `s3`, `spaces` or `r2`. |
| `FILESYSTEM_DRIVER` | `local` | `local` | The default Laravel disk. |
| `QUEUE_CONVERSIONS_BY_DEFAULT` | `true` | `true` | Makes the image conversions on the queue. |
| `IMAGE_DRIVER` | `gd` | `gd` | The image library for the conversions: `gd` or `imagick`. |
| `FFMPEG_PATH` | `/usr/bin/ffmpeg` | `/usr/bin/ffmpeg` | The FFmpeg binary of the media library. |
| `FFPROBE_PATH` | `/usr/bin/ffprobe` | `/usr/bin/ffprobe` | The FFprobe binary of the media library. |
| `ENABLE_MEDIA_LIBRARY_VAPOR_UPLOADS` | `false` | | A media library option for Laravel Vapor. |

The variables of each bucket type are in [Storage](storage.md): `AWS_*` for `s3`, `DO_SPACES_*` for `spaces` and `CLOUDFLARE_R2_*` for `r2`.

## Renderer

| Variable | Default | Example | What it does |
|---|---|---|---|
| `RENDER_DRIVER` | `browsershot` | `browsershot` | `browserless` or `browsershot`. Docker sets `browserless`. |
| `BROWSERLESS_URL` | none | empty | The URL of the Browserless service. Docker sets `http://browserless:3000`. |
| `BROWSERLESS_TOKEN` | none | empty | The Browserless token. Docker requires it. |
| `BROWSERLESS_TIMEOUT` | `15` | `15` | The timeout of one Browserless request, in seconds. The app tries 3 times, and 3 attempts must fit in the Horizon job timeout of 60 seconds. |
| `BROWSERSHOT_NODE_PATH` | `/usr/local/bin/node` | commented out | The Node binary for Browsershot. |
| `BROWSERSHOT_NPM_PATH` | `/usr/local/bin/npm` | commented out | The npm binary for Browsershot. |
| `BROWSERSHOT_INSTANCE` | empty | empty | A remote Chrome as `host:port` for Browsershot. Empty starts a local Chrome. |

Read [Rendering](rendering.md).

## MCP server and OAuth

| Variable | Default | Example | What it does |
|---|---|---|---|
| `MCP_ENABLED` | `true` | `true` | When it is `false`, the app has no `/mcp` route and no OAuth route. The REST API keeps working. |
| `MCP_REDIRECT_DOMAINS` | `https://claude.ai,https://claude.com` | same | The hosts that can receive an OAuth authorization code. Comma separated, scheme and host only. |
| `MCP_CUSTOM_SCHEMES` | empty | empty | Private-use URI schemes of desktop clients, for example `cursor`. A scheme here is accepted with any host. |
| `MCP_AUTHORIZATION_SERVER` | this instance | commented out | The OAuth issuer that the discovery documents name. |
| `PASSPORT_PRIVATE_KEY` | none | commented out | The private key of Passport. Without it, Passport reads the key file in `storage`. |
| `PASSPORT_PUBLIC_KEY` | none | commented out | The public key of Passport. |
| `PASSPORT_CONNECTION` | none | commented out | The database connection of the Passport tables. |

Read [OAuth](../mcp/oauth.md).

## Free tools API

| Variable | Default | Example | What it does |
|---|---|---|---|
| `SNAPSBREW_FREE_TOOLS_ENABLED` | `false` | `false` | Turns on the four public `POST /api/v1/tools/*` endpoints. They return 404 while it is `false`. |
| `SNAPSBREW_FREE_TOOLS_USER_ID` | `1` | `1` | The user that owns the screenshots of the free screenshot tool. |
| `SNAPSBREW_FREE_TOOLS_CERTIFICATE_TEMPLATE` | none | empty | The UUID of the template that the certificate tool renders. |
| `SNAPSBREW_FREE_TOOLS_TESTIMONIAL_TEMPLATE` | none | empty | The UUID of the template that the testimonial tool renders. |
| `SNAPSBREW_FREE_TOOLS_TWITTER_GRAPH_TEMPLATE` | none | empty | The UUID of the template that the Twitter graph tool renders. |
| `SNAPSBREW_FREE_TOOLS_REQUESTS_PER_MINUTE_PER_IP` | `5` | `5` | The requests that one IP can send to all free tools together in one minute. |
| `SNAPSBREW_FREE_TOOLS_REQUESTS_PER_DAY_PER_IP` | `50` | `50` | The requests that one IP can send to all free tools together in one day. |

An instance without a marketing site can keep these endpoints off. Read [Free tools](../api/free-tools.md).

## Docs social cards

| Variable | Default | Example | What it does |
|---|---|---|---|
| `SNAPSBREW_SIGNED_URL_KEY` | none | empty | A signed-URL key of this instance, for the social cards of the docs pages. |
| `SNAPSBREW_OG_TEMPLATE` | none | empty | The UUID of a template with `badge`, `headline` and `subhead` layers. |
| `SNAPSBREW_OG_BASE` | `APP_URL` | `${APP_URL}` | The base URL of the signed card URLs. |

If `SNAPSBREW_SIGNED_URL_KEY` or `SNAPSBREW_OG_TEMPLATE` is empty, the docs pages use a static image.

## Logs and errors

| Variable | Default | Example | What it does |
|---|---|---|---|
| `LOG_CHANNEL` | `stack` | `stack` | The log channel. `stack` writes daily files in `storage/logs`. The Docker image sets `stderr`. |
| `LOG_LEVEL` | `debug` | `debug` | The lowest level that the log keeps. |
| `LOG_STDERR_FORMATTER` | none | | A Monolog formatter for the `stderr` channel. |
| `LOG_SLACK_WEBHOOK_URL` | none | | The webhook of the `slack` channel. |
| `PAPERTRAIL_URL` | none | | The host of the `papertrail` channel. |
| `PAPERTRAIL_PORT` | none | | The port of the `papertrail` channel. |
| `ROLLBAR_TOKEN` | none | empty | When it is set, the `stack` channel also sends errors to Rollbar. |

## Other Laravel variables

The Laravel configuration files also read these variables. Snapsbrew does not use them in a default install:

| Variable | Default | Used by |
|---|---|---|
| `BROADCAST_DRIVER` | `null` | Broadcasting. `.env.example` sets `log`. |
| `PUSHER_APP_ID`, `PUSHER_APP_KEY`, `PUSHER_APP_SECRET`, `PUSHER_APP_CLUSTER` | none | The Pusher broadcaster. |
| `ABLY_KEY` | none | The Ably broadcaster. |
| `MEMCACHED_HOST`, `MEMCACHED_PORT`, `MEMCACHED_USERNAME`, `MEMCACHED_PASSWORD`, `MEMCACHED_PERSISTENT_ID` | `127.0.0.1`, `11211`, none | The Memcached cache store. |
| `DYNAMODB_CACHE_TABLE`, `DYNAMODB_ENDPOINT` | `cache`, none | The DynamoDB cache store. |
| `SQS_PREFIX`, `SQS_QUEUE`, `SQS_SUFFIX` | an example URL, `default`, none | The SQS queue driver. |
| `MAILGUN_DOMAIN`, `MAILGUN_SECRET`, `MAILGUN_ENDPOINT` | none, none, `api.mailgun.net` | The Mailgun mailer. |
| `POSTMARK_TOKEN` | none | The Postmark mailer. |
