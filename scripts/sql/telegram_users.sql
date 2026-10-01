-- Telegram users mapping (server webhook only)
create table if not exists public.telegram_users (
  id bigserial primary key,
  telegram_id bigint not null unique,
  user_id bigint null references public.users(id) on delete set null,
  username text null,
  first_name text null,
  last_name text null,
  is_active boolean not null default true,
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telegram_users_user_id_idx on public.telegram_users (user_id);
create index if not exists telegram_users_username_idx on public.telegram_users (username);

alter table public.telegram_users enable row level security;

comment on table public.telegram_users is 'Maps Telegram chat users to optional E7ketha accounts; written by server webhook only.';
