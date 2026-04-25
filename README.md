# CFPen

A personal CodePen-style editor built on Cloudflare Workers, Static Assets, D1, and R2.

## Local Development

```bash
nvm use
npm install
npm run dev
```

The app uses:

- Vite + React + TypeScript for the SPA.
- Monaco Editor for HTML/CSS/TypeScript editing.
- A Cloudflare Worker for `/api/*` and `/assets/*`.
- D1 for pens and asset metadata.
- R2 for uploaded asset objects.

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

## Notes

Preview code runs only in a sandboxed iframe using `srcdoc`. The app does not execute user JavaScript on the Worker.
