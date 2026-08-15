-- =========================================================================
-- Anima database schema (Postgres / Supabase)
-- Translated from the original anima-back Mongoose models.
--
-- Design notes:
--   * Every "array of numeric IDs" relation from the Mongo models becomes
--     either a foreign key column (one-to-many) or a join table
--     (many-to-many). This is what makes filtering fast later
--     (e.g. "action anime from Studio X after 2020") -- it becomes a
--     normal SQL join instead of a multi-step Mongo aggregation.
--   * Images are NEVER stored here -- only their URLs. Actual files
--     belong in object storage (Supabase Storage / Cloudflare R2).
--   * auth.users is Supabase's built-in auth table. `profiles` extends it
--     with one row per user for account-wide info. `site_profiles` holds
--     one row per (user, site) so usernames don't leak/duplicate across
--     your different properties (comics site, social site, etc).
-- =========================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------- Accounts ----------
-- auth.users is managed by Supabase Auth automatically (email, password, etc).
-- This table just extends it with app-wide profile info shared across all sites.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- One row per user PER SITE. This is what lets someone use the same login
-- everywhere but pick a different username/avatar/bio on each property.
create table site_profiles (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  site text not null check (site in ('comics', 'social', 'movies', 'tv', 'games')),
  username text not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  unique (site, username),   -- username must be unique within a site, not globally
  unique (user_id, site)     -- one profile per user per site
);

-- ---------- Reference / lookup tables ----------
create table genres (
  id bigint generated always as identity primary key,
  name text not null unique,
  localisation jsonb default '{}'
);

create table categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  localisation jsonb default '{}'
);

create table tags (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table studios (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  image_url text,
  links text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table staff (
  id bigint generated always as identity primary key,
  staff_type text not null,           -- was `_type`, e.g. 'voice_actor' | 'director' | 'author'
  name text not null,
  description text,
  age text,
  height text,
  gender text,
  birthday date,
  location text,
  blood_type text,
  image_url text,
  links text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table studio_employees (
  studio_id bigint not null references studios(id) on delete cascade,
  staff_id bigint not null references staff(id) on delete cascade,
  role text,
  primary key (studio_id, staff_id)
);

-- ---------- Core media table ----------
-- Covers anime / manga / light novels / VNs / manhwa / manhua / webtoons
-- via media_type, same idea as the original `_media_type` field.
create table media (
  id bigint generated always as identity primary key,
  is_private boolean not null default false,
  media_type text not null check (
    media_type in ('anime','manga','light_novel','visual_novel','manhwa','manhua','webcomic')
  ),
  show_type text,                     -- e.g. 'TV', 'Movie', 'OVA', 'Oneshot', 'Series'
  status text,                        -- e.g. 'Finished', 'Ongoing', 'Upcoming'
  name text not null,
  short_name text,
  description text,
  localisation jsonb default '{}',
  content_rating text,                -- e.g. '16+'
  episodes_count int,
  episodes_duration int,              -- minutes, null for non-episodic media
  links text[] default '{}',
  started_at date,
  finished_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- media <-> media relations (sequel, prequel, adaptation, spin-off, etc.)
create table media_relations (
  media_id bigint not null references media(id) on delete cascade,
  related_media_id bigint not null references media(id) on delete cascade,
  relation_type text not null,        -- 'sequel' | 'prequel' | 'adaptation' | 'side_story' ...
  primary key (media_id, related_media_id, relation_type),
  check (media_id <> related_media_id)
);

create table media_genres (
  media_id bigint not null references media(id) on delete cascade,
  genre_id bigint not null references genres(id) on delete cascade,
  primary key (media_id, genre_id)
);

create table media_tags (
  media_id bigint not null references media(id) on delete cascade,
  tag_id bigint not null references tags(id) on delete cascade,
  primary key (media_id, tag_id)
);

create table media_studios (
  media_id bigint not null references media(id) on delete cascade,
  studio_id bigint not null references studios(id) on delete cascade,
  role text not null default 'studio' check (role in ('studio','producer')),
  primary key (media_id, studio_id, role)
);

-- Aggregate stats, one row per media (was the embedded `stats` object)
create table media_stats (
  media_id bigint primary key references media(id) on delete cascade,
  favorites int not null default 0,
  score numeric(4,2),
  watching int not null default 0,
  completed int not null default 0,
  planning int not null default 0,
  paused int not null default 0,
  dropped int not null default 0,
  updated_at timestamptz not null default now()
);

-- Score-bucket breakdown (was models/rating.js)
create table media_score_breakdown (
  media_id bigint primary key references media(id) on delete cascade,
  bucket_10 int not null default 0,
  bucket_25 int not null default 0,
  bucket_50 int not null default 0,
  bucket_100 int not null default 0,
  bucket_250 int not null default 0
);

-- ---------- Characters & staff on media ----------
create table characters (
  id bigint generated always as identity primary key,
  media_id bigint not null references media(id) on delete cascade,
  name text not null,
  age text,
  gender text,
  birthday date,
  description text,
  image_url text,
  role text,                          -- 'main' | 'supporting' | 'background'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table character_voice_actors (
  character_id bigint not null references characters(id) on delete cascade,
  staff_id bigint not null references staff(id) on delete cascade,
  role text,                          -- e.g. language ('jp', 'en')
  primary key (character_id, staff_id, role)
);

create table media_staff (
  media_id bigint not null references media(id) on delete cascade,
  staff_id bigint not null references staff(id) on delete cascade,
  role text,                          -- 'director' | 'author' | 'illustrator' ...
  primary key (media_id, staff_id, role)
);

-- ---------- User-generated content ----------
create table reviews (
  id bigint generated always as identity primary key,
  media_id bigint not null references media(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  review_type text not null default 'standard',
  short_comment text,
  content text not null,
  likes int not null default 0,
  dislikes int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table threads (
  id bigint generated always as identity primary key,
  media_id bigint references media(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  is_spoiler boolean not null default false,
  likes int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table thread_labels (
  thread_id bigint not null references threads(id) on delete cascade,
  category_id bigint not null references categories(id) on delete cascade,
  primary key (thread_id, category_id)
);

create table comments (
  id bigint generated always as identity primary key,
  thread_id bigint not null references threads(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  is_deleted boolean not null default false,
  is_edited boolean not null default false,
  likes int not null default 0,
  dislikes int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table attachments (
  id bigint generated always as identity primary key,
  media_id bigint references media(id) on delete cascade,
  attachment_type text not null,      -- 'trailer' | 'op' | 'ed' | 'artwork' ...
  url text not null,
  name text not null,
  airing_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table attachment_authors (
  attachment_id bigint not null references attachments(id) on delete cascade,
  staff_id bigint not null references staff(id) on delete cascade,
  primary key (attachment_id, staff_id)
);

-- Generic like/dislike/favorite table -- replaces the old free-form
-- models/stats.js, which stored the same idea with a looser shape.
create table reactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('media','character','staff','review','comment')),
  target_id bigint not null,
  reaction_type text not null check (reaction_type in ('like','dislike','favorite')),
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id, reaction_type)
);

-- Personal watch/read list -- new, but this is core MAL/AniList-style
-- functionality and fits naturally now that relations are real FKs.
create table media_list_entries (
  user_id uuid not null references profiles(id) on delete cascade,
  media_id bigint not null references media(id) on delete cascade,
  status text not null check (status in ('watching','completed','planning','paused','dropped')),
  score numeric(3,1),
  progress int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, media_id)
);

-- ---------- Indexes for the filters you'll actually query on ----------
create index idx_media_type on media (media_type);
create index idx_media_status on media (status);
create index idx_media_genres_genre on media_genres (genre_id);
create index idx_media_studios_studio on media_studios (studio_id);
create index idx_characters_media on characters (media_id);
create index idx_reviews_media on reviews (media_id);
create index idx_threads_media on threads (media_id);
create index idx_comments_thread on comments (thread_id);
create index idx_site_profiles_user on site_profiles (user_id);
