# Database MVP

## Main entities

### `projects`

- `id`
- `slug`
- `name`
- `city`
- `address`
- `lat`
- `lng`
- `class`
- `completion_date`
- `min_price`
- `max_price`

### `flats`

- `id`
- `project_id`
- `external_id`
- `rooms`
- `area`
- `price`
- `floor`
- `finish_type`
- `status`

### `user_sessions`

- `id`
- `started_at`
- `last_seen_at`
- `source`

### `user_places`

- `id`
- `session_id`
- `type`
- `label`
- `address`
- `lat`
- `lng`
- `priority`
- `max_travel_minutes`

### `project_travel_cache`

- `id`
- `project_id`
- `origin_hash`
- `transport_mode`
- `travel_minutes`
- `distance_meters`
- `computed_at`

### `leads`

- `id`
- `session_id`
- `project_id`
- `name`
- `phone`
- `created_at`

## SQL draft

```sql
create table projects (
  id text primary key,
  slug text not null unique,
  name text not null,
  city text not null,
  address text not null,
  lat numeric(9, 6) not null,
  lng numeric(9, 6) not null,
  class text,
  completion_date date,
  min_price integer not null,
  max_price integer not null
);

create table flats (
  id text primary key,
  project_id text not null references projects(id),
  external_id text,
  rooms integer not null,
  area numeric(6, 2) not null,
  price integer not null,
  floor integer,
  finish_type text,
  status text not null
);

create table user_sessions (
  id text primary key,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  source text
);

create table user_places (
  id text primary key,
  session_id text not null references user_sessions(id),
  type text not null,
  label text not null,
  address text not null,
  lat numeric(9, 6),
  lng numeric(9, 6),
  priority integer not null default 1,
  max_travel_minutes integer
);

create table project_travel_cache (
  id text primary key,
  project_id text not null references projects(id),
  origin_hash text not null,
  transport_mode text not null,
  travel_minutes integer not null,
  distance_meters integer,
  computed_at timestamptz not null default now()
);

create unique index project_travel_cache_lookup_idx
  on project_travel_cache(project_id, origin_hash, transport_mode);
```

