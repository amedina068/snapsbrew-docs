---
title: Authentication
description: Read the account and the company of the current API token.
order: 2
---

# Authentication

Each authenticated endpoint takes an API token as a bearer token. The token must carry the `api_requests` ability. To create a token, read [API overview](overview.md#create-an-api-token).

| Method | Path | What it does |
|---|---|---|
| `GET` | `/v1/auth` | Returns the account and the company of the token. |

## Read the current token

```http
GET /v1/auth
```

Use this endpoint to make sure that a token works.

- **Auth:** bearer token
- **Ability:** `api_requests`
- **Rate limit:** `api` (60 a minute)
- **Usage log:** yes

### Response

`200` returns the account of the token. `company` is `null` when the account belongs to no company.

```json
{
  "data": {
    "email": "dev@example.com",
    "name": "Ada Lovelace",
    "company": "Analytical Engines"
  }
}
```

### Errors

| Status | Cause |
|---|---|
| `401` | The token is missing, wrong or revoked, or the owner deactivated the user. The body is `{"message": "Unauthenticated."}`. |
| `403` | The token has no `api_requests` ability. The body is `{"message": "Invalid ability provided."}`. |
| `429` | The `api` limit is full. Wait for the number of seconds in `Retry-After`. The body is `{"message": "Too Many Attempts."}`. |

### Examples

```bash
curl https://snapsbrew.example/api/v1/auth \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json'
```

```php
use Illuminate\Support\Facades\Http;

$response = Http::withToken(config('services.snapsbrew.token'))
    ->acceptJson()
    ->get('https://snapsbrew.example/api/v1/auth');

if ($response->unauthorized()) {
    // The token does not work. Create a new token.
}

$email = $response->json('data.email');
```
