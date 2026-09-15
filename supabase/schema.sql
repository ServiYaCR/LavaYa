-- ============================================================
-- ServiYa (Poplin風 洗濯マッチングアプリ) - Supabase スキーマ
-- Costa Rica専用 / Phase 1
-- Supabase Dashboard > SQL Editor にそのまま貼り付けて実行してください
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- 1. profiles: auth.users と1:1。役割(customer/provider)を保持
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone_whatsapp text,
  role text check (role in ('customer', 'provider')),
  privacy_policy_version text,        -- 同意時点のポリシーバージョン（例 '2026-09-v1'）
  privacy_accepted_at timestamptz,    -- Ley 8968 対応：同意日時の記録
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. customer_profiles: 顧客の追加情報
-- ------------------------------------------------------------
create table public.customer_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  province text,
  canton text,
  address_notes text,       -- señas particulares（伝統的な住所説明）
  access_type text,         -- 'condominio_seguridad' | 'casa_independiente' | 'otro'
  payment_method text check (payment_method in ('card', 'sinpe')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. provider_profiles: プロバイダー（Washer）の追加情報
-- ------------------------------------------------------------
create table public.provider_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  cedula text unique not null,              -- 9桁（入力マスクはフロント側で処理）
  cedula_verified boolean not null default false,
  legal_name_from_registry text,            -- TSE照合API から自動補完される氏名
  face_photo_url text,
  cedula_photo_url text,
  sinpe_phone text,                         -- Sinpe Móvil 送金用電話番号
  biometric_consent_at timestamptz,   -- 顔写真・cédula提供への明示同意日時（Ley 8968）
  has_washer_dryer boolean not null default false,
  service_radius_km numeric not null default 5,
  latitude double precision,
  longitude double precision,
  status text not null check (status in ('pending_review','approved','rejected','suspended')) default 'pending_review',
  rating numeric not null default 5.0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. orders: 注文（Poplinの重量確定フローに対応）
-- ------------------------------------------------------------
create type order_status as enum (
  'placed',              -- 依頼作成
  'awaiting_pickup',     -- プロバイダー確定・集荷待ち
  'picked_up',           -- 集荷完了
  'washing',             -- 作業中
  'ready_for_delivery',  -- 乾燥後計量・金額確定・配達待ち
  'delivered',           -- 配達完了
  'cancelled',
  'disputed'
);

create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customer_profiles(id),
  provider_id uuid references public.provider_profiles(id),
  status order_status not null default 'placed',
  express boolean not null default false,
  bag_labels jsonb not null default '[]',   -- [{"type":"machine_dry"},{"type":"hang_dry","hangers":5}]
  estimated_weight_kg numeric,
  final_weight_kg numeric,                  -- 乾燥後の確定重量（Poplin方式）
  price_colones numeric,
  detergent_pref text check (detergent_pref in ('premium','hypoallergenic','own')),
  special_instructions text,
  unsanitary_flagged boolean not null default false,
  oversized_items int not null default 0,   -- 大型・特殊品の点数(掛け布団等)
  pickup_photo_url text,                    -- 集荷時の証跡写真
  delivery_photo_url text,                  -- 配達時の証跡写真
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_events (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status order_status not null,
  note text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. Row Level Security
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "customer_profiles_all_own" on public.customer_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "provider_profiles_all_own" on public.provider_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "orders_select_involved" on public.orders
  for select using (auth.uid() = customer_id or auth.uid() = provider_id);
create policy "orders_insert_customer" on public.orders
  for insert with check (auth.uid() = customer_id);
create policy "orders_update_involved" on public.orders
  for update using (auth.uid() = customer_id or auth.uid() = provider_id);

create policy "order_events_select_involved" on public.order_events
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
      and (auth.uid() = o.customer_id or auth.uid() = o.provider_id)
    )
  );
