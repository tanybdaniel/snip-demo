import fs from "fs";
import path from "path";

// Configuration
const PORT = parseInt(process.env.PORT || "3000");
const RAILWAY_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN;
const BASE_URL = process.env.BASE_URL;
const PUBLIC_DIR = process.env.PUBLIC_DIR;

function normalizeBaseUrl(baseUrl) {
  return baseUrl ? baseUrl.replace(/\/+$/, "") : baseUrl;
}

function getPublicBaseUrl(req, requestUrl) {
  const configured = normalizeBaseUrl(BASE_URL);
  if (configured) return configured;

  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host") || requestUrl.host;

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const proto = forwardedProto || requestUrl.protocol.replace(":", "");

  if (host && proto) {
    return `${proto}://${host}`;
  }

  if (RAILWAY_DOMAIN) {
    return `https://${RAILWAY_DOMAIN}`;
  }

  return `http://localhost:${PORT}`;
}

// In-memory storage
const links = new Map(); // code -> { code, url, shortUrl, hits, createdAt }

/**
 * Generate a 6-character random base62 string
 */
function generateCode() {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * 62)];
  }
  return code;
}

/**
 * Validate URL format
 */
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Try to serve static file from PUBLIC_DIR
 */
async function serveStaticFile(filePath) {
  if (!PUBLIC_DIR) return null;

  // Sanitize path to prevent directory traversal
  const fullPath = path.join(PUBLIC_DIR, filePath);
  const normalized = path.normalize(fullPath);

  if (!normalized.startsWith(path.normalize(PUBLIC_DIR))) {
    return null;
  }

  try {
    if (fs.existsSync(normalized)) {
      const content = fs.readFileSync(normalized);
      const ext = path.extname(normalized);
      const mimeTypes = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
      };
      const contentType = mimeTypes[ext] || "application/octet-stream";
      return new Response(content, {
        status: 200,
        headers: { "Content-Type": contentType },
      });
    }
  } catch {
    // Silently fall through
  }

  return null;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle OPTIONS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // POST /api/links - create new short link
    if (req.method === "POST" && path === "/api/links") {
      try {
        const body = await req.json();
        const { url: originalUrl } = body;

        if (!originalUrl || typeof originalUrl !== "string") {
          return new Response(
            JSON.stringify({ error: "Missing or invalid 'url' field" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }

        if (!isValidUrl(originalUrl)) {
          return new Response(
            JSON.stringify({ error: "Invalid URL format; must be http(s)://" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }

        // Generate unique code
        let code;
        do {
          code = generateCode();
        } while (links.has(code));

        const now = new Date().toISOString();
        const publicBaseUrl = getPublicBaseUrl(req, url);
        const linkData = {
          code,
          url: originalUrl,
          shortUrl: `${publicBaseUrl}/${code}`,
          hits: 0,
          createdAt: now,
        };

        links.set(code, linkData);

        return new Response(JSON.stringify(linkData), {
          status: 201,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Invalid JSON" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // GET /api/links - list all links
    if (req.method === "GET" && path === "/api/links") {
      const allLinks = Array.from(links.values());
      return new Response(JSON.stringify(allLinks), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // GET /:code - redirect to original URL
    if (req.method === "GET" && path !== "/" && path !== "/api/links" && !path.startsWith("/api/")) {
      const code = path.slice(1); // Remove leading /

      if (links.has(code)) {
        const linkData = links.get(code);
        linkData.hits++;

        return new Response(null, {
          status: 302,
          headers: {
            Location: linkData.url,
            ...corsHeaders,
          },
        });
      }

      // If not found as a short code, try serving static file
      if (PUBLIC_DIR) {
        const staticResponse = await serveStaticFile(path);
        if (staticResponse) {
          return staticResponse;
        }

        // Try index.html as fallback
        if (path === "/" || path === "") {
          const indexResponse = await serveStaticFile("/index.html");
          if (indexResponse) {
            return indexResponse;
          }
        }
      }

      return new Response(
        JSON.stringify({ error: "Short code or file not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // GET / with PUBLIC_DIR - serve index.html
    if (req.method === "GET" && (path === "/" || path === "")) {
      if (PUBLIC_DIR) {
        const indexResponse = await serveStaticFile("/index.html");
        if (indexResponse) {
          return indexResponse;
        }
      }

      return new Response(
        JSON.stringify({ message: "Snip URL Shortener API" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Not found
    return new Response(
      JSON.stringify({ error: "Not found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  },
});

const startupBaseUrl = normalizeBaseUrl(BASE_URL) ||
  (RAILWAY_DOMAIN ? `https://${RAILWAY_DOMAIN}` : `http://localhost:${PORT}`);
console.log(`🚀 Snip server running at ${startupBaseUrl}`);
console.log(`   Listening on port ${PORT}`);
if (PUBLIC_DIR) {
  console.log(`   Serving static files from ${PUBLIC_DIR}`);
}
