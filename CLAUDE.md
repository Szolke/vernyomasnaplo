# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Blood-pressure log app, deployed at https://vernyomasnaplo.pages.dev/ via Cloudflare Pages. No build step, no package manager — two files:

- `index.html` — the entire frontend (Hungarian UI). Inline CSS/JS, minified single-line style. Client-side entries mirror into `localStorage['bp:cache']` on every save attempt *regardless of whether the cloud save succeeds* — so data surviving a page refresh is not proof the cloud sync works. Check the footer status text or the Network tab response for the real state.
- `functions/api/entries.js` — Cloudflare Pages Function serving `GET`/`PUT /api/entries`, backed by a KV namespace bound as `BP_KV` (namespace `bp-store`), gated by a bearer token checked against the `ACCESS_TOKEN` secret. The browser prompts once for this token and caches it in `localStorage['bp:token']`.

Pages Functions must live under `functions/` (route = file path) — a file at the repo root is never registered as a route.

## Deploy

Git push to `main` auto-deploys to Production (Cloudflare Pages git integration). No CI, no tests, no lint config in this repo.

## Cloudflare dashboard gotcha

`BP_KV` and `ACCESS_TOKEN` are configured under Settings → Bindings / Variables and secrets, scoped to the **Production** environment (see the "Choose Environment" dropdown at the top of that page — Preview and Production are configured separately). We hit a case where the binding showed correctly under Production yet every deployment (including "Retry deployment") still reported it as `undefined` in `env` — a stuck binding reference on Cloudflare's side. Fix: delete the binding, save, re-add it, save, then push a **new commit** (retrying an existing deployment reuses its stale binding snapshot and does not pick up the fix).

`entries.js` deliberately returns JSON errors (`{error, detail}`, 500) instead of letting exceptions bubble up — an uncaught exception in a Pages Function renders as Cloudflare's generic "Error 1101" HTML page, which hides the real cause.
