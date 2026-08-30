-- Platform expansion: Profiles, Opportunities, Notifications, and Saved Opportunities.

-- 1. Extend profile table
alter table profile add column if not exists skills text[] default '{}';
alter table profile add column if not exists interests text[] default '{}';
alter table profile add column if not exists preferred_locations text[] default '{}';
alter table profile add column if not exists preferred_opportunity_types text[] default '{}';

-- 2. Extend opportunity table for user creation & publishing status
alter table opportunity add column if not exists creator_user_id uuid references auth.users on delete cascade;
alter table opportunity add column if not exists status text not null default 'published';
alter table opportunity add column if not exists description text;
alter table opportunity add column if not exists organization text;
alter table opportunity add column if not exists tags text[] default '{}';
alter table opportunity add column if not exists skills text[] default '{}';
alter table opportunity add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table opportunity add constraint opportunity_status_check check (status in (
    'draft', 'pending_review', 'published', 'rejected', 'expired'
  ));
exception when duplicate_object then null;
end $$;

create index if not exists opportunity_creator_idx on opportunity (creator_user_id);
create index if not exists opportunity_status_idx on opportunity (status);

-- 3. Create notification table
create table if not exists notification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  opportunity_id uuid references opportunity on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists notification_user_idx on notification (user_id);
create index if not exists notification_is_read_idx on notification (user_id, is_read);

-- 4. Create saved_opportunity table
create table if not exists saved_opportunity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  opportunity_id uuid not null references opportunity on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

create index if not exists saved_opportunity_user_idx on saved_opportunity (user_id);

-- RLS Enablement
alter table notification enable row level security;
alter table saved_opportunity enable row level security;

-- Opportunity Policies for user-created content
create policy insert_own_opportunity on opportunity for insert with check (
  auth.uid() is not null and (creator_user_id is null or creator_user_id = auth.uid())
);

create policy update_own_opportunity on opportunity for update using (
  creator_user_id = auth.uid()
) with check (
  creator_user_id = auth.uid()
);

create policy delete_own_opportunity on opportunity for delete using (
  creator_user_id = auth.uid()
);

-- Notification Policies
create policy own_notifications on notification for all using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
);

-- Saved Opportunity Policies
create policy own_saved_opportunity on saved_opportunity for all using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
);
