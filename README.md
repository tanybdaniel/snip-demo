# Snip CLI

A tiny, zero-dependency command-line interface for the Snip URL shortener.

## Installation

Requires Node 20+

```bash
npm install
```

Or use via `node` directly:
```bash
node cli.js add https://github.com
```

## Usage

### Create a short link

```bash
snip add <url>
```

Creates a new short link and prints the short URL.

```bash
$ snip add https://github.com
http://localhost:3000/abc123
```

### List all links

```bash
snip ls
```

Prints all links in an aligned table with code, hit count, and original URL.

```bash
$ snip ls
Code    Hits  URL
------  ----  ---
abc123  0     https://github.com
def456  2     https://example.com
```

Prints "No links yet." when the list is empty.

### Open a link in browser

```bash
snip open <code>
```

Fetches the redirect target and opens it in your default browser (uses `open` on macOS, `start` on Windows, `xdg-open` on Linux).

```bash
$ snip open abc123
# Opens https://github.com in your browser
```

### Show help

```bash
snip help
```

Shows the help text.

## Environment

- **SNIP_API** (optional) — API base URL; defaults to `http://localhost:3000`

```bash
SNIP_API=https://my-snip.example.com snip ls
```

## Exit Codes

- `0` — Success
- `1` — Error (bad input, unknown code, unreachable backend)

All errors are printed to stderr.

## Wrappers

Three wrapper scripts are provided for convenience:

- **`snip`** — POSIX shell script (macOS, Linux)
- **`snip.cmd`** — Windows batch script
- **`snip.ps1`** — PowerShell script

The recommended approach is to link `cli.js` via the `snip` bin entry in `package.json`, or use one of the wrappers directly.

## Implementation

- CommonJS (no ES modules)
- Uses built-in Node `fetch` (Node 20+)
- Zero external dependencies
