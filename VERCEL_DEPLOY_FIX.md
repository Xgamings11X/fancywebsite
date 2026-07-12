# Vercel dependency install fix

Deployment previously stopped during `npm install` with:

```text
npm error Exit handler never called!
```

The project now uses pnpm 10 instead of npm for Vercel builds. The previous `package-lock.json` was generated in an internal build environment and contained private registry URLs, so it has been removed.

## Files changed

- `package.json`: pins Node 22, pins tested direct dependency versions, and declares `pnpm@10.14.0`.
- `pnpm-lock.yaml`: new reproducible public lockfile.
- `package-lock.json`: removed.
- `vercel.json`: removed the forced `npm install` command and uses `pnpm run build`.
- `.npmrc`: explicitly uses the public npm registry and disables install-time audit/funding output.

## Vercel settings

Normally no dashboard override is needed. Vercel detects `pnpm-lock.yaml` automatically.

If the project already has an old Install Command override, open:

`Project Settings -> Build & Deployment -> Install Command`

Disable the override or set it to:

```text
pnpm install --frozen-lockfile
```

Then redeploy with **Clear build cache** once.
