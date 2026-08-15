# Zenbu — migrated to Postgres/Supabase

This is your original `zenbu-back` API, rebuilt on Postgres (via Supabase)
instead of MongoDB, based on the conversation about why relational data
fits an anime/manga database better long-term.

## What changed vs. the original

- **Database**: MongoDB/Mongoose → Postgres via Supabase. Every array-of-IDs
  relation (genres, characters, staff, studios, relations) is now a real
  foreign key or join table — see `schema.sql`.
- **Auth**: none before → Supabase Auth. Write endpoints (`POST`/`PUT`/`DELETE`)
  now require a logged-in user via `middleware/auth.js`. Read endpoints
  (`GET`) are still public.
- **Connection**: no more hardcoded `mongodb://127.0.0.1`. Config lives in
  `.env` (see `.env.example`), read from environment variables — works
  the same locally and once deployed.
- **New**: `site_profiles` table + `/profiles/me` routes implement the
  shared-login-but-per-site-username system from our earlier discussion.
  `media_list_entries` adds a personal watch/read list (watching/completed/
  planning/etc.) — this wasn't in the original models but is core to what
  a MAL-style site needs, and it's essentially free now that relations are
  proper foreign keys.
- **Images**: nothing here stores image bytes — only `image_url` /
  `avatar_url` text columns. Actual files should go in Supabase Storage or
  Cloudflare R2 (both have a free tier), not the database, to stay well
  under the 500 MB free Postgres limit.

## Setup

1. **Create a Supabase project** at supabase.com (free tier).
2. **Run the schema**: open your project's SQL Editor and paste in the
   contents of `schema.sql`, then run it. This creates every table, join
   table, and index.
3. **Get your API keys**: Project Settings → API. Copy the URL, the
   `service_role` key, and the `anon` key.
4. In `server/`, copy `.env.example` to `.env` and fill in those three
   values.
5. Install and run:
   ```
   cd server
   npm install
   npm run dev
   ```
6. Check it's alive: `GET http://localhost:3069/health` should return
   `{"status":"ok"}`.

## Deploying

- **API**: push this repo to GitHub, connect it to **Render** (free web
  service tier), set the same environment variables from `.env` in
  Render's dashboard, deploy. Render runs a normal persistent Node
  process, so nothing here needs to change for that to work.
- **Database**: already live on Supabase once you ran the schema — nothing
  extra to deploy.
- If your Supabase project is on the free tier, it auto-pauses after 7
  days with no requests. A free scheduled ping (GitHub Actions cron, or a
  service like UptimeRobot) hitting `/health` once a day keeps it awake.

## Endpoints

Same shape as your original API, plus a few new resources:

- `GET/POST /media`, `GET/PUT/DELETE /media/:id`
- `GET /:category`, `GET /:category/:id` — where category is one of
  `anime`, `manga`, `light_novel`, `visual_novel`, `manhwa`, `manhua`,
  `webcomic`
- `GET/POST /genres`
- `GET/POST /studios`, `GET /studios/:id`
- `GET/POST /characters`, `POST /characters/search`
- `GET/POST /staff`, `POST /staff/search`
- `GET/POST/PUT/DELETE /reviews`
- `GET/POST /threads`, `GET/POST /threads/:id/comments`, `DELETE /comments/:id`
- `POST/DELETE /reactions` — like/dislike/favorite any media, character,
  staff, review, or comment
- `GET/POST /profiles/me?site=comics` — this site's profile for the
  logged-in user

## What's intentionally not built yet

- No search/filter combos beyond the basics in `media.js` (e.g. "genre +
  studio + year range" all at once) — easy to add as you need specific
  filter UI, this is where SQL's `WHERE` + indexes pay off.
- No image upload endpoint — wire up Supabase Storage or Cloudflare R2
  when you get to that part of the frontend.
- No rate limiting — fine for early/low traffic, worth adding
  (e.g. `express-rate-limit`) before this is public-facing.
