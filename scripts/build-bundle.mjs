#!/usr/bin/env node

/**
 * build-bundle.mjs – Assemble the Snip release bundle
 * 
 * Usage:
 *   node scripts/build-bundle.mjs           # Build (no push)
 *   node scripts/build-bundle.mjs --push    # Build and push
 * 
 * This script:
 * 1. Updates submodules to branch tips
 * 2. Builds the frontend
 * 3. Assembles bundle/ with server + CLI + built UI
 * 4. Commits to bundle branch (idempotent)
 * 5. Bumps submodule pointer on main
 * 6. Pushes (if --push)
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const bundleDir = path.join(repoRoot, 'bundle');
const frontendDir = path.join(repoRoot, 'frontend');
const backendDir = path.join(repoRoot, 'backend');
const cliDir = path.join(repoRoot, 'cli');
const scriptDir = path.join(repoRoot, 'scripts');

const pushFlag = process.argv.includes('--push');
let hadErrors = false;

function log(...args) {
  console.log('[build-bundle]', ...args);
}

function error(...args) {
  console.error('[build-bundle] ERROR:', ...args);
  hadErrors = true;
}

function shell(cmd, opts = {}) {
  log(`$ ${cmd}`);
  try {
    return execSync(cmd, {
      cwd: opts.cwd || repoRoot,
      stdio: 'inherit',
      ...opts
    });
  } catch (err) {
    error(`Command failed: ${cmd}`);
    throw err;
  }
}

function shellQuiet(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      cwd: opts.cwd || repoRoot,
      encoding: 'utf-8',
      stdio: 'pipe',
      ...opts
    }).trim();
  } catch (err) {
    throw err;
  }
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source not found: ${src}`);
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  entries.forEach(entry => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

async function main() {
  try {
    log('=== Snip Build Bundle ===');
    log(`Push: ${pushFlag ? 'YES (--push flag)' : 'NO (dry run)'}`);
    log('');

    // Step 1: Update submodules
    log('Step 1: Updating submodules to branch tips...');
    shell('git submodule update --init --remote backend frontend cli');
    log('✓ Submodules updated\n');

    // Step 2: Build frontend
    log('Step 2: Building Angular frontend...');
    shell('npm install', { cwd: frontendDir });
    shell('npx ng build', { cwd: frontendDir });

    const indexPath = path.join(frontendDir, 'dist', 'snip-frontend', 'browser', 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Frontend build failed: ${indexPath} not found`);
    }
    log('✓ Frontend built successfully\n');

    // Step 3: Prepare bundle directory
    log('Step 3: Assembling bundle directory...');
    
    // Ensure bundle directory exists
    if (!fs.existsSync(bundleDir)) {
      fs.mkdirSync(bundleDir, { recursive: true });
    }

    // Copy server.js from backend
    const srcServer = path.join(backendDir, 'server.js');
    const destServer = path.join(bundleDir, 'server.js');
    fs.copyFileSync(srcServer, destServer);
    log('  ✓ Copied server.js');

    // Copy cli.js from cli
    const srcCli = path.join(cliDir, 'cli.js');
    const destCli = path.join(bundleDir, 'cli.js');
    fs.copyFileSync(srcCli, destCli);
    log('  ✓ Copied cli.js');

    // Copy frontend build to public/
    const publicDir = path.join(bundleDir, 'public');
    if (fs.existsSync(publicDir)) {
      fs.rmSync(publicDir, { recursive: true });
    }
    fs.mkdirSync(publicDir, { recursive: true });
    copyRecursive(
      path.join(frontendDir, 'dist', 'snip-frontend', 'browser'),
      publicDir
    );
    log('  ✓ Copied frontend build to public/');

    // Create .env
    const envContent = 'PUBLIC_DIR=./public\n';
    fs.writeFileSync(path.join(bundleDir, '.env'), envContent);
    log('  ✓ Created .env');

    // Create package.json (NO "type": "module" so cli.js runs as CommonJS)
    const packageJson = {
      name: 'snip-bundle',
      version: '1.0.0',
      description: 'Snip – All-in-one bundle (server + UI + CLI)',
      main: 'server.js',
      scripts: {
        start: 'bun server.js'
      },
      keywords: ['snip', 'url-shortener'],
      author: '',
      license: 'MIT'
    };
    fs.writeFileSync(
      path.join(bundleDir, 'package.json'),
      JSON.stringify(packageJson, null, 2) + '\n'
    );
    log('  ✓ Created package.json');

    // Create Dockerfile
    const dockerfile = `FROM oven/bun:1-alpine

WORKDIR /app
COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["bun", "server.js"]
`;
    fs.writeFileSync(path.join(bundleDir, 'Dockerfile'), dockerfile);
    log('  ✓ Created Dockerfile');

    // Create .dockerignore
    const dockerignore = `node_modules
npm-debug.log
.git
.gitmodules
.gitignore
dist
backend
frontend
cli
scripts
README.md
`;
    fs.writeFileSync(path.join(bundleDir, '.dockerignore'), dockerignore);
    log('  ✓ Created .dockerignore');

    // Create railway.json
    const railwayJson = {
      $schema: 'https://railway.app/railway.schema.json',
      build: {
        builder: 'DOCKERFILE'
      },
      deploy: {
        startCommand: 'bun server.js',
        restartPolicyMaxRetries: 5
      }
    };
    fs.writeFileSync(
      path.join(bundleDir, 'railway.json'),
      JSON.stringify(railwayJson, null, 2) + '\n'
    );
    log('  ✓ Created railway.json');
    log('✓ Bundle directory assembled\n');

    // Step 4: Commit in bundle branch (if changes)
    log('Step 4: Committing bundle changes...');
    const bundleStatus = shellQuiet('git status --porcelain', { cwd: bundleDir });
    
    if (bundleStatus) {
      log('  Changes detected in bundle/');
      shell('git add -A', { cwd: bundleDir });
      shell('git commit -m "Generated: rebuild bundle with latest frontend/backend/cli"', { cwd: bundleDir });
      log('  ✓ Committed bundle changes');
    } else {
      log('  No changes in bundle/ – skipping commit');
    }
    log('');

    // Step 5: Update superproject pointer to bundle
    log('Step 5: Bumping bundle submodule pointer in superproject...');
    const bundlePointerBefore = shellQuiet('git ls-tree HEAD bundle');
    
    shell('git submodule update --remote bundle');
    
    const bundlePointerAfter = shellQuiet('git ls-tree HEAD bundle');
    if (bundlePointerBefore !== bundlePointerAfter) {
      log('  Pointer changed; staging bundle/ for commit');
      shell('git add bundle');
    } else {
      log('  Pointer unchanged');
    }
    log('');

    // Step 6: Commit on main (if bundle changed)
    log('Step 6: Checking for superproject changes...');
    const mainStatus = shellQuiet('git status --porcelain', { cwd: repoRoot });
    
    if (mainStatus) {
      log('  Changes detected on main');
      shell('git commit -m "Bump bundle submodule"');
      log('  ✓ Committed to main');
    } else {
      log('  No changes on main – skipping commit');
    }
    log('');

    // Step 7: Push (if --push flag)
    if (pushFlag) {
      log('Step 7: Pushing branches...');
      log('  Pushing bundle branch...');
      // Push from detached HEAD in bundle to bundle branch
      shell('git push origin HEAD:bundle', { cwd: bundleDir });
      log('  ✓ Pushed bundle');

      log('  Pushing main branch...');
      shell('git push origin main', { cwd: repoRoot });
      log('  ✓ Pushed main');
    } else {
      log('Step 7: Skipping push (dry run mode)');
      log('  To push, re-run with: node scripts/build-bundle.mjs --push');
    }
    log('');

    log('=== Build Complete ===');
    if (!hadErrors) {
      log('✓ Bundle assembled successfully');
    }
  } catch (err) {
    error(err.message);
    process.exit(1);
  }
}

main();
