# Build & Release – Snip Bundle

The `scripts/build-bundle.mjs` script automates the release build process.

## What It Does

1. **Updates submodules** to their latest commits on tracked branches
2. **Builds the frontend** – Angular production build
3. **Assembles bundle/** – copies:
   - `server.js` from backend
   - `cli.js` from cli
   - Built Angular app to `bundle/public/`
   - `.env` with `PUBLIC_DIR=./public` (tells Bun to also serve the UI)
   - `package.json` with start script
   - `Dockerfile` (FROM `oven/bun:1-alpine`)
   - `.dockerignore`
   - `railway.json` (Railway.app config)
4. **Commits to bundle branch** – only if files changed (idempotent)
5. **Bumps bundle pointer on main** – pins the new commit
6. **Pushes** – if `--push` flag is passed

## Usage

### Dry Run (No Push)

```bash
node scripts/build-bundle.mjs
```

Assembles the bundle and commits/stages changes locally. Useful for testing and verification.

### Build & Push

```bash
node scripts/build-bundle.mjs --push
```

After verification, re-run with `--push` to push both `bundle` branch and `main` branch.

### Typical Workflow

1. Make changes to backend, frontend, or cli
2. Commit and push those branches
3. On main, run:
   ```bash
   git submodule update --remote backend frontend cli
   git add backend frontend cli
   git commit -m "Bump layers to latest"
   git push
   ```
4. Then build the release:
   ```bash
   node scripts/build-bundle.mjs
   # Verify bundle/ looks good
   node scripts/build-bundle.mjs --push
   ```

## Idempotency

The script is **safe to run multiple times**:

- If no files changed in `bundle/`, no commit is made
- Submodule pointers only update if commits are new
- Pushing only happens with `--push` flag

Example:
```bash
$ node scripts/build-bundle.mjs
✓ Bundle assembled successfully

$ node scripts/build-bundle.mjs
# Runs again, but outputs "No changes in bundle/ – skipping commit"
# No new commits added
```

## Testing the Bundle

After building:

### Run Locally with Bun

```bash
cd bundle
bun start
# Listens on http://localhost:3000
# Serves: API + redirects + web UI
```

### Build & Run Docker Image

```bash
cd bundle
docker build -t snip .
docker run --rm -p 3000:3000 snip
# Open http://localhost:3000
```

### Deploy to Railway

The `railway.json` config is already present. On Railway.app:
1. Connect your repo
2. Railway auto-detects the `Dockerfile` and deploys `bundle` branch
3. App runs on PORT=3000

## Files Generated

Inside `bundle/`:
- `server.js` – Bun server (unchanged from backend)
- `cli.js` – CLI tool (unchanged from cli)
- `public/` – Static assets from Angular build
- `.env` – Runtime config for Bun
- `package.json` – Metadata (no ES modules so cli.js works as CommonJS)
- `Dockerfile` – Container spec
- `.dockerignore` – Docker build ignore rules
- `railway.json` – Railway.app deployment config
- `README.md` – Bundle branch info

## CI/CD Integration

The script works in GitHub Actions or any CI system:

```yaml
- name: Build Snip Bundle
  run: node scripts/build-bundle.mjs --push
  env:
    GIT_AUTHOR_NAME: github-actions[bot]
    GIT_AUTHOR_EMAIL: github-actions[bot]@users.noreply.github.com
    GIT_COMMITTER_NAME: github-actions[bot]
    GIT_COMMITTER_EMAIL: github-actions[bot]@users.noreply.github.com
```

(See `.github/workflows/bundle.yml` for the full example.)

## Troubleshooting

**"Frontend build failed: index.html not found"**
- Check `frontend/dist/snip-frontend/browser/index.html` exists
- Run `cd frontend && npm install && npx ng build` manually

**"No changes in bundle/"**
- The script detects no new changes; this is normal
- Run it again to verify: should skip commit, no-op
- If you changed backend/frontend/cli, re-run after pushing those

**Push fails with "detached HEAD"**
- Bundle checkout may be in detached HEAD state (normal for submodules)
- Script handles this by pushing `HEAD:bundle` (from current HEAD to bundle branch)
- This always works, no need to checkout the branch explicitly
