---
title: Editor documents
description: Read, change, replace and inspect the v2 editor document of a template with compare-and-swap writes.
order: 5
---

# Editor documents

An editor document is the v2 draft of a template. It holds the layers, the groups and each design-time property that the editor shows. A change to the document changes the next render after you publish the template.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/v1/templates/{templateUuid}/document` | Returns the document and its revision. |
| `PATCH` | `/v1/templates/{templateUuid}/document` | Applies a list of operations. |
| `PUT` | `/v1/templates/{templateUuid}/document` | Replaces the full document. |
| `GET` | `/v1/templates/{templateUuid}/document/preflight` | Returns the known problems of the document. |

For each endpoint:

- **Auth:** bearer token
- **Ability:** `api_requests`
- **Rate limit:** `editor-document` (30 a minute for one user, 180 a minute for one company) and `api` (60 a minute)
- **Usage log:** no

The account must be a `customer` or an `admin` of the company of the template. The same accounts can read and write the document.

### Errors for each endpoint

| Status | Cause |
|---|---|
| `401` | The token is missing or wrong. The body is `{"message": "Unauthenticated."}`. |
| `403` | The token has no `api_requests` ability. The body is `{"message": "Invalid ability provided."}`. |
| `403` | The account cannot read or change templates of the company. The body is `{"message": "This action is unauthorized."}`. |
| `404` | The template is not in your company. The body is `{"message": "No query results for model [App\\Models\\Template]."}`. |
| `429` | The `editor-document` limit or the `api` limit is full. Wait for the number of seconds in `Retry-After`. |

## Compare-and-swap writes

Each write sends the `revision` from the last read. If the stored revision is different, the write saves nothing and returns `409`.

```json
{
  "code": "editor_document_conflict",
  "current_revision": 5,
  "current_document": {"version": 2, "layers": [], "groups": []}
}
```

If you get `409`, do these steps:

1. Read `current_document` and `current_revision`.
2. Apply your change again on top of `current_document`.
3. Send the write with `current_revision`.

Do not send the same body again with only the new revision. That write removes the changes of another person.

`PATCH` changes only the properties that you name. `PUT` replaces the full document and removes each property that you do not send. Use `PATCH` unless you rebuild the full document.

To read the limits of the document, call [`GET /v1/guides/editor-document`](guides.md#get-the-editor-document-contract).

## Get the editor document

```http
GET /v1/templates/{templateUuid}/document
```

Returns the stored document and its revision. A template with no v2 draft returns `"document": null` and `"revision": 0`.

```json
{
  "document": {
    "version": 2,
    "layers": [
      {"key": "headline", "type": "text", "properties": [{"name": "fontWeight", "value": 700}]}
    ],
    "groups": []
  },
  "revision": 4
}
```

| Status | Cause |
|---|---|
The request example is in [Examples](#examples).

## Apply editor operations

```http
PATCH /v1/templates/{templateUuid}/document
```

Applies the operations in order and saves the result under the next revision. All operations apply together, or none applies.

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `revision` | integer | Yes | 0 or more | The revision from the last read. |
| `operations` | array | Yes | 1 to 100 items | The operations, in order. |

Two operations exist:

| `operation` | Fields | What it does |
|---|---|---|
| `set_layer_property` | `layer_key`, `property`, `value` | Sets one property of one layer. |
| `set_layer_type` | `layer_key`, `type` | Changes the type of one layer. |

`200` returns the saved document and the new revision.

```json
{
  "document": {
    "version": 2,
    "layers": [
      {"key": "headline", "type": "text", "properties": [{"name": "fontWeight", "value": 700}]}
    ],
    "groups": []
  },
  "revision": 5
}
```

The request example is in [Examples](#examples).

| Status | Cause |
|---|---|
| `409` | The stored revision moved. The body has the code `editor_document_conflict`. See [Compare-and-swap writes](#compare-and-swap-writes). |
| `422` | The body is not valid, or the document refuses an operation. |

A refused operation returns a stable `code`, for example `{"code": "editor_operation_layer_not_found"}`. These codes exist:

- `editor_operation_document_missing`: the template has no v2 document.
- `editor_operation_document_invalid`
- `editor_operation_invalid_request`
- `editor_operation_unknown_type`
- `editor_operation_layer_not_found`
- `editor_operation_layer_not_unique`
- `editor_operation_invalid_property`
- `editor_operation_invalid_value`
- `editor_operation_invalid_layer_type`
- `editor_operation_invalid_svg`
- `editor_operation_shape_requires_svg`

A body that is not valid returns the standard validation shape, with a message under `errors.revision` or `errors.operations`.

## Replace the editor document

```http
PUT /v1/templates/{templateUuid}/document
```

Replaces the full v2 document and saves it under the next revision. Send the document that you read, with your change in it. Each layer or property that you do not send is removed.

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `revision` | integer | Yes | 0 or more | The revision from the last read. |
| `document` | object | Yes | An object | The full v2 document, with `version`, `layers` and `groups`. |

The document has these limits: 262144 bytes, 1000 nodes, a depth of 12 and 16384 characters for one string. A document over a limit returns `422` with `editor_document_too_large` or `editor_document_budget_exceeded` under `errors.document`.

```json
{
  "message": "The given data was invalid.",
  "errors": {"document": ["editor_document_too_large"]}
}
```

```bash
curl -X PUT https://snapsbrew.example/api/v1/templates/141e8454-8aa1-420a-bd0b-18a85ba949a2/document \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{"revision":4,"document":{"version":2,"layers":[],"groups":[]}}'
```

`200` returns the saved document and the new revision:

```json
{
  "document": {"version": 2, "layers": [], "groups": []},
  "revision": 5
}
```

| Status | Cause |
|---|---|
| `409` | The stored revision moved. The body has the code `editor_document_conflict`. |
| `422` | The body is not valid, or the document is over a limit. |

## Inspect the editor document

```http
GET /v1/templates/{templateUuid}/document/preflight
```

Reads the stored document and returns its known problems. It changes nothing. Each problem has a `code`, a JSON pointer in `path` and a `message`. An empty `issues` list means that the known checks pass. It does not prove that the render looks correct.

```bash
curl https://snapsbrew.example/api/v1/templates/141e8454-8aa1-420a-bd0b-18a85ba949a2/document/preflight \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json'
```

`200` returns the issues and the revision that the check read:

```json
{
  "issues": [
    {
      "code": "image_asset_missing",
      "path": "/layers/0/source",
      "message": "Image layers require a pinned asset id."
    }
  ],
  "revision": 4
}
```

Run the preflight after the last write and before you publish the template.

## Examples

Read the document, then make the headline bold:

```bash
curl https://snapsbrew.example/api/v1/templates/<uuid>/document \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json'

curl -X PATCH https://snapsbrew.example/api/v1/templates/<uuid>/document \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{"revision":4,"operations":[{"operation":"set_layer_property","layer_key":"headline","property":"fontWeight","value":700}]}'
```

The same change in PHP, with one retry after a conflict:

```php
use Illuminate\Support\Facades\Http;

$api = Http::withToken(config('services.snapsbrew.token'))
    ->acceptJson()
    ->baseUrl('https://snapsbrew.example/api');

$path = "/v1/templates/{$templateUuid}/document";
$operations = [[
    'operation' => 'set_layer_property',
    'layer_key' => 'headline',
    'property' => 'fontWeight',
    'value' => 700,
]];

$revision = $api->get($path)->throw()->json('revision');
$response = $api->patch($path, ['revision' => $revision, 'operations' => $operations]);

if ($response->status() === 409) {
    // Another write came first. The operations name only one property,
    // so they are still correct on top of the current document.
    $response = $api->patch($path, [
        'revision' => $response->json('current_revision'),
        'operations' => $operations,
    ]);
}

$response->throw();

$issues = $api->get("{$path}/preflight")->throw()->json('issues');
```
