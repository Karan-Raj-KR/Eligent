-- Supabase schema. Run in the SQL editor or via `supabase db push`.
-- Exactly 6 tables per CLAUDE.md.

create table profile (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  cgpa numeric,
  percentage numeric,
  year_of_study int,
  branch text,
  state text,
  annual_family_income numeric,
  institution_type text,
  category text,
  gender text,
  created_at timestamptz not null default now()
);

create table opportunity (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null,
  url text not null,
  deadline date,
  amount text,
  -- Hand-entered by a human (see CLAUDE.md: never invent scholarship data).
  -- Copied into application_requirement as source='official' when an application is created.
  official_documents text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table criterion (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunity on delete cascade,
  field text not null,
  operator text not null check (operator in ('gte', 'lte', 'eq', 'in', 'not_in', 'between')),
  value jsonb not null,
  display_text text,
  source_text text
);
create index on criterion (opportunity_id);

create table application (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  opportunity_id uuid not null references opportunity on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'ready_for_review')),
  progress jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

create table application_requirement (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references application on delete cascade,
  document_type text not null,
  source text not null check (source in ('official', 'community')),
  user_has boolean,
  created_at timestamptz not null default now()
);
create index on application_requirement (application_id);

create table report (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunity on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  report_type text not null check (
    report_type in ('wrong_deadline', 'extra_document', 'file_limit', 'criteria_mismatch', 'closed', 'other')
  ),
  note text,
  created_at timestamptz not null default now()
);
create index on report (opportunity_id);

-- RLS
alter table profile enable row level security;
alter table opportunity enable row level security;
alter table criterion enable row level security;
alter table application enable row level security;
alter table application_requirement enable row level security;
alter table report enable row level security;

-- profile: own rows only
create policy own_profile on profile for all using (auth.uid() = id) with check (auth.uid() = id);

-- opportunity, criterion: readable by all, no direct writes from clients
create policy read_opportunity on opportunity for select using (true);
create policy read_criterion on criterion for select using (true);

-- application: own rows only
create policy own_application on application for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- application_requirement: own rows only, scoped through the parent application
create policy own_application_requirement on application_requirement for all using (
  exists (
    select 1 from application
    where application.id = application_requirement.application_id
      and application.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from application
    where application.id = application_requirement.application_id
      and application.user_id = auth.uid()
  )
);

-- report: any authenticated user may insert, everyone may read
create policy read_report on report for select using (true);
create policy insert_report on report for insert with check (auth.uid() = user_id);
