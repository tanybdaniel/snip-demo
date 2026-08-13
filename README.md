# Snip Backend

A tiny URL shortener API built with [Bun](https://bun.sh), with zero npm dependencies.

## Features

- **Shortcode Generation**: Creates 6-character base62 short codes
- **In-Memory Storage**: Links stored in a Map (cleared on restart)
- **CORS Support**: Cross-origin requests from browser apps
- **Static File Serving**: Optional serving of a built frontend from `PUBLIC_DIR`
- **Environment Config**: Configurable port and base URL

## API

### POST `/api/links`
Create a new short link.

**Request:**
```json
{ "url": "https://example.com/very/long/path" }
```

**Success (201):**
```json
{
  "code": "abc123",
  "url": "https://example.com/very/long/path",
  "shortUrl": "http://localhost:3000/abc123",
  "hits": 0,
  "createdAt": "2025-08-13T10:00:00.000Z"
}
```

**Error (400):** Invalid JSON or non-http(s) URL

### GET `/api/links`
List all short links.

**Response (200):**
```json
[
  { "code": "abc123", "url": "...", "shortUrl": "...", "hits": 0, "createdAt": "..." },
  { "code": "def456", "url": "...", "shortUrl": "...", "hits": 2, "createdAt": "..." }
]
```

### GET `/:code`
Redirect to original URL, incrementing hit count.

**Success (302):** Redirect to original URL
**Error (404):** Short code not found

## Installation & Running

Requires [Bun 1.x](https://bun.sh/docs/installation)

```bash
bun start
```

Defaults to `http://localhost:3000`

## Configuration

Environment variables:

- **PORT** (default: `3000`) — Server port
- **BASE_URL** — Origin for `shortUrl` values
  - Defaults to `https://$RAILWAY_PUBLIC_DOMAIN` if set, else `http://localhost:3000`
- **PUBLIC_DIR** (optional) — Folder to serve static files from
  - When set, `GET /` serves `index.html`
  - Static files take precedence over short codes

## Example Usage

```bash
# Start the server
bun start

# Create a short link
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com"}'

# List all links
curl http://localhost:3000/api/links

# Redirect to original
curl -i http://localhost:3000/abc123
```

## Notes

- Storage is in-memory and cleared on restart (by design)
- All URLs must be valid http:// or https:// addresses
- Short codes are automatically generated; collisions are extremely unlikely
