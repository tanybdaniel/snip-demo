#!/usr/bin/env node

/**
 * Snip CLI – A zero-dependency CLI for the Snip URL shortener
 * Usage:
 *   snip add <url>    Create a short link
 *   snip ls           List all links
 *   snip open <code>  Open a short link in browser
 *   snip help         Show this help text
 */

const API_URL = process.env.SNIP_API || 'http://localhost:3000';
const args = process.argv.slice(2);
const command = args[0];

/**
 * Print help text
 */
function printHelp() {
  console.log(`
Snip – URL Shortener CLI

Usage:
  snip add <url>     Create a short link for the given URL
  snip ls            List all short links
  snip open <code>   Open a short link in your browser
  snip help          Show this help text

Environment:
  SNIP_API           API base URL (default: http://localhost:3000)

Examples:
  snip add https://github.com
  snip ls
  snip open abc123
  `);
}

/**
 * Print error to stderr and exit
 */
function error(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

/**
 * POST /api/links – Create a new short link
 */
async function addLink(url) {
  if (!url) {
    error('URL is required. Usage: snip add <url>');
  }

  // Validate URL format
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      error('Invalid URL. Must start with http:// or https://');
    }
  } catch {
    error('Invalid URL format');
  }

  try {
    const response = await fetch(`${API_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      error(errorData.error || `HTTP ${response.status}`);
    }

    const link = await response.json();
    console.log(link.shortUrl);
  } catch (err) {
    error(`Failed to reach API at ${API_URL}: ${err.message}`);
  }
}

/**
 * GET /api/links – List all links in a formatted table
 */
async function listLinks() {
  try {
    const response = await fetch(`${API_URL}/api/links`, {
      method: 'GET'
    });

    if (!response.ok) {
      error(`HTTP ${response.status}`);
    }

    const links = await response.json();

    if (links.length === 0) {
      console.log('No links yet.');
      return;
    }

    // Calculate column widths
    const codeWidth = Math.max(4, Math.max(...links.map(l => l.code.length)));
    const hitsWidth = Math.max(4, Math.max(...links.map(l => String(l.hits).length)));
    const urlWidth = Math.max(3, Math.max(...links.map(l => l.url.length)));

    // Print header
    console.log(
      'Code'.padEnd(codeWidth) + '  ' +
      'Hits'.padEnd(hitsWidth) + '  ' +
      'URL'
    );
    console.log('-'.repeat(codeWidth + hitsWidth + urlWidth + 4));

    // Print rows
    links.forEach(link => {
      console.log(
        link.code.padEnd(codeWidth) + '  ' +
        String(link.hits).padEnd(hitsWidth) + '  ' +
        link.url
      );
    });
  } catch (err) {
    error(`Failed to reach API at ${API_URL}: ${err.message}`);
  }
}

/**
 * GET /:code – Open a short link in the browser
 */
async function openLink(code) {
  if (!code) {
    error('Code is required. Usage: snip open <code>');
  }

  try {
    const response = await fetch(`${API_URL}/${code}`, {
      method: 'GET',
      redirect: 'manual'
    });

    if (response.status === 404) {
      error(`Short code not found: ${code}`);
    }

    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('location');
      if (!location) {
        error('Redirect response missing Location header');
      }

      // Open in browser based on platform
      const { spawn } = await import('child_process');
      let command;
      let args = [location];

      if (process.platform === 'win32') {
        command = 'start';
      } else if (process.platform === 'darwin') {
        command = 'open';
      } else {
        command = 'xdg-open';
      }

      const proc = spawn(command, args, { stdio: 'ignore' });
      proc.on('error', (err) => {
        error(`Failed to open browser: ${err.message}`);
      });
    } else {
      error(`Unexpected response status: ${response.status}`);
    }
  } catch (err) {
    error(`Failed to reach API at ${API_URL}: ${err.message}`);
  }
}

/**
 * Main entry point
 */
async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case 'add':
      await addLink(args[1]);
      break;
    case 'ls':
      await listLinks();
      break;
    case 'open':
      await openLink(args[1]);
      break;
    default:
      error(`Unknown command: ${command}. Run 'snip help' for usage.`);
  }
}

main().catch(err => {
  error(err.message);
});
