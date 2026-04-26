# CFPen

A personal CodePen-style editor built on Cloudflare Workers, Static Assets, D1, and R2.

## Features

- Monaco-based editor with HTML, CSS, and JavaScript or TypeScript panes (TypeScript is compiled in the browser before preview).
- Live `srcdoc` preview with desktop, laptop, tablet, and mobile breakpoints.
- In-app console capturing `log`, `warn`, and `error` output from the preview iframe.
- Per-pen asset library backed by R2 — upload, rename, and delete images, SVGs, and other files (10 MB cap per file).
- Pen list with create, fork, soft-delete, and share-by-slug links.
- Public read-only share view at `/p/:slug` for pens you want to show off without exposing the editor.

## Tech Stack

- **Frontend:** Vite + React 19 + TypeScript, Monaco Editor, lucide-react icons.
- **Backend:** Single Cloudflare Worker handling `/api/*` and `/assets/*`.
- **Storage:** D1 for pen and asset metadata, R2 for asset blobs.
- **Static hosting:** Cloudflare Static Assets with SPA fallback, bound as `ASSETS`.

## Project Layout

```
src/
  client/     React SPA (editor, share view, API client)
  worker/     Cloudflare Worker (pens + assets API, asset proxy)
migrations/   D1 schema migrations
tests/        Vitest unit tests
```

## Local Development

```bash
nvm use
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite + Workers dev server with hot reload. |
| `npm run build` | Type-check and produce `dist/client`. |
| `npm run preview` | Preview the built SPA locally. |
| `npm run deploy` | Build then `wrangler deploy` against the bundled config. |
| `npm test` | Run the Vitest suite once. |
| `npm run typecheck` | Run `tsc -b` only. |

## Cloudflare Setup

Create the backing services:

```bash
npx wrangler d1 create cfpen
npx wrangler r2 bucket create cfpen-assets
```

Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with the D1 database ID, then run:

```bash
npx wrangler d1 migrations apply cfpen --remote
npm run deploy
```

## API Surface

All routes live on the Worker. Pen IDs are UUIDs; share slugs are random tokens.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/pens` | List active pens. |
| `POST` | `/api/pens` | Create a pen. |
| `GET` | `/api/pens/:id` | Read a pen. |
| `PUT` | `/api/pens/:id` | Update title, HTML, CSS, or JS. |
| `DELETE` | `/api/pens/:id` | Soft-delete a pen. |
| `POST` | `/api/pens/:id/fork` | Duplicate a pen with a new slug. |
| `GET` | `/api/pens/:id/assets` | List a pen's assets. |
| `POST` | `/api/pens/:id/assets` | Upload an asset (multipart `file` field). |
| `PATCH` | `/api/pens/:id/assets/:assetId` | Rename an asset. |
| `DELETE` | `/api/pens/:id/assets/:assetId` | Delete an asset and its R2 object. |
| `GET` | `/api/shared/:slug` | Public pen read by share slug. |
| `GET` | `/assets/:r2Key` | Stream an asset from R2. |

## Cloudflare Access

Keep shared pens public by protecting only private/editor routes in Cloudflare Access.

Recommended protected paths:

- `/`
- `/editor/*`
- `/api/pens/*`
- `/api/assets/*` if private asset-management endpoints are added later

Leave these public:

- `/p/*`
- `/api/shared/*`
- `/assets/*`

## Testing

```bash
npm test
```

Tests live in `tests/` and cover the Worker API (`worker.test.ts`) and preview document construction (`preview.test.ts`).

## Notes

Preview code runs only in a sandboxed iframe using `srcdoc`. The app does not execute user JavaScript on the Worker.
