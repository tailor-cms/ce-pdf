# PDF

PDF content element with upload support.

**Type:** `PDF`

## Data

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string \| null` | Public PDF URL |

## Edit

- PDF preview rendered in an iframe
- Upload button in top toolbar (PDF) with URL source support

## Display

- Renders the PDF in an iframe viewer

## Development

```sh
pnpm dev     # Preview :8080 | Edit :8010 | Display :8020 | Server :8030
pnpm build
pnpm lint
pnpm test
```

## Run with Docker

```sh
docker compose up
```
