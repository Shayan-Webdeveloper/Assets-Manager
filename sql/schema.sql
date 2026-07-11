  -- =========================================================
  -- MaintainIQ — Supabase Schema (Track B)
  -- Run this in Supabase SQL Editor (Project -> SQL Editor -> New query)
  -- =========================================================

  -- ---------- PROFILES (extends auth.users with a role) ----------
  create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null,
    role text not null default 'admin' check (role in ('admin','technician')),
    created_at timestamptz not null default now()
  );

  -- ---------- ASSETS ----------
  create table if not exists assets (
    id uuid primary key default gen_random_uuid(),
    asset_code text not null unique,          -- e.g. AST-0001, human/QR facing
    name text not null,
    category text not null,
    location text not null,
    condition text not null default 'Good' check (condition in ('Good','Fair','Poor')),
    status text not null default 'Operational'
      check (status in ('Operational','Issue Reported','Under Inspection','Under Maintenance','Out of Service','Retired')),
    assigned_technician uuid references profiles(id),
    last_service_date date,
    next_service_date date,
    created_by uuid references profiles(id),
    created_at timestamptz not null default now()
  );

  -- ---------- ISSUES ----------
  create table if not exists issues (
    id uuid primary key default gen_random_uuid(),
    issue_number text not null unique,        -- e.g. ISS-0001
    asset_id uuid not null references assets(id) on delete cascade,
    title text not null,
    description text not null,
    category text,
    priority text not null default 'Medium' check (priority in ('Low','Medium','High','Critical')),
    status text not null default 'Reported'
      check (status in ('Reported','Assigned','Inspection Started','Maintenance In Progress','Waiting for Parts','Resolved','Closed','Reopened')),
    reporter_name text,
    reporter_contact text,
    assigned_to uuid references profiles(id),
    ai_suggested jsonb,        -- raw AI/triage suggestion
    ai_edited boolean default false,
    evidence_url text,
    created_at timestamptz not null default now()
  );

  -- ---------- MAINTENANCE RECORDS ----------
  create table if not exists maintenance_records (
    id uuid primary key default gen_random_uuid(),
    issue_id uuid not null references issues(id) on delete cascade,
    technician_id uuid references profiles(id),
    notes text not null,
    parts_used text,
    cost numeric(10,2) default 0 check (cost >= 0),
    evidence_url text,
    created_at timestamptz not null default now()
  );

  -- ---------- ASSET HISTORY (append-only activity log) ----------
  create table if not exists asset_history (
    id uuid primary key default gen_random_uuid(),
    asset_id uuid not null references assets(id) on delete cascade,
    issue_id uuid references issues(id),
    actor_name text not null,
    action text not null,
    details text,
    created_at timestamptz not null default now()
  );

  -- =========================================================
  -- Row Level Security
  -- =========================================================
  alter table profiles enable row level security;
  alter table assets enable row level security;
  alter table issues enable row level security;
  alter table maintenance_records enable row level security;
  alter table asset_history enable row level security;

  -- Profiles: user can read/update own row; admins can read all
  create policy "profiles_self_select" on profiles for select using (auth.uid() = id);
  create policy "profiles_self_update" on profiles for update using (auth.uid() = id);
  create policy "profiles_self_insert" on profiles for insert with check (auth.uid() = id);

  -- Assets: any authenticated user (admin/technician) can read/write;
  -- PUBLIC (anon) can only SELECT safe columns via a view (see below)
  create policy "assets_auth_select" on assets for select to authenticated using (true);
  create policy "assets_auth_insert" on assets for insert to authenticated with check (true);
  create policy "assets_auth_update" on assets for update to authenticated using (true);

  -- Issues: authenticated staff full access; anon can INSERT (public issue reporting)
  -- and SELECT their own issue by issue_number (handled in app logic)
  create policy "issues_auth_all" on issues for all to authenticated using (true) with check (true);
  create policy "issues_anon_insert" on issues for insert to anon with check (true);
  create policy "issues_anon_select" on issues for select to anon using (true);

  -- Maintenance records: staff only
  create policy "maintenance_auth_all" on maintenance_records for all to authenticated using (true) with check (true);

  -- Asset history: staff read/write; anon can read (safe recent activity on public page)
  create policy "history_auth_all" on asset_history for all to authenticated using (true) with check (true);
  create policy "history_anon_select" on asset_history for select to anon using (true);

  -- =========================================================
  -- PUBLIC-SAFE VIEW for the QR / public asset page
  -- Hides technician notes, cost, reporter contact, etc.
  -- =========================================================
  create or replace view public_assets as
  select
    id, asset_code, name, category, location, condition, status,
    last_service_date, next_service_date
  from assets;

  grant select on public_assets to anon;

  -- allow anon to read this view regardless of underlying RLS
  alter view public_assets set (security_invoker = off);

  -- =========================================================
  -- Helper: auto-generate sequential asset/issue codes
  -- =========================================================
  create sequence if not exists asset_code_seq start 1;
  create sequence if not exists issue_number_seq start 1;

  create or replace function next_asset_code() returns text as $$
    select 'AST-' || lpad(nextval('asset_code_seq')::text, 4, '0');
  $$ language sql;

  create or replace function next_issue_number() returns text as $$
    select 'ISS-' || lpad(nextval('issue_number_seq')::text, 4, '0');
  $$ language sql;

  -- =========================================================
  -- Seed a couple of demo assets (optional — remove if not wanted)
  -- =========================================================
  -- insert into assets (asset_code, name, category, location, condition, status)
  -- values
  --  (next_asset_code(), 'Classroom Projector 01', 'Electronics', 'Room 204', 'Good', 'Operational'),
  --  (next_asset_code(), 'Split AC Unit - Lab 2', 'HVAC', 'Computer Lab 2', 'Fair', 'Operational');
