-- CRM de Disparos WhatsApp via uazapi
-- Tabelas: instâncias, pool de mensagens, campanhas, fila de envio, leads globais

-- Instâncias uazapi (múltiplos números para rotação)
create table if not exists crm_instances (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  token        text not null,
  subdomain    text not null,
  status       text not null default 'disconnected',
  phone        text,
  daily_limit  int  not null default 200,
  sent_today   int  not null default 0,
  last_reset_at date,
  created_at   timestamptz not null default now()
);

-- Pool de templates de mensagem
create table if not exists crm_message_pool (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  body            text not null,
  category        text,
  use_ai_rewrite  bool not null default true,
  ativo           bool not null default true,
  created_at      timestamptz not null default now()
);

-- Campanhas
create table if not exists crm_campaigns (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  status                   text not null default 'draft',
  instance_ids             uuid[]  not null default '{}',
  message_pool_ids         uuid[]  not null default '{}',
  delay_min_ms             int     not null default 3000,
  delay_max_ms             int     not null default 9000,
  daily_limit_per_instance int     not null default 150,
  use_ai_rewrite           bool    not null default true,
  ai_tone                  text    not null default 'casual',
  started_at               timestamptz,
  paused_at                timestamptz,
  done_at                  timestamptz,
  created_at               timestamptz not null default now()
);

-- Fila de envio por campanha (um registro por destinatário)
create table if not exists crm_recipients (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references crm_campaigns(id) on delete cascade,
  phone           text not null,
  name            text,
  empresa         text,
  type            text not null default 'individual',
  ddd             text,
  bairro          text,
  state           text,
  send_after      timestamptz,
  instance_id     uuid references crm_instances(id),
  status          text not null default 'pending',
  tags            text[] not null default '{}',
  message_sent    text,
  sent_at         timestamptz,
  last_replied_at timestamptz
);

create index if not exists crm_recipients_campaign_status on crm_recipients(campaign_id, status);
create index if not exists crm_recipients_send_after on crm_recipients(send_after) where status = 'pending';

-- Leads globais cross-campanha (acumula score de todas as campanhas)
create table if not exists crm_leads (
  id               uuid primary key default gen_random_uuid(),
  phone            text not null unique,
  name             text,
  score            int  not null default 0,
  tags             text[] not null default '{}',
  ddd              text,
  bairro           text,
  state            text,
  total_received   int  not null default 0,
  total_replied    int  not null default 0,
  blocked          bool not null default false,
  last_campaign_at timestamptz,
  last_reply_at    timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists crm_leads_score on crm_leads(score desc);
create index if not exists crm_leads_ddd on crm_leads(ddd);

-- RPC para incrementar score + contadores do lead atomicamente (evita race conditions)
create or replace function crm_lead_increment(
  p_phone text,
  p_score_delta int,
  p_received_delta int,
  p_name text default null,
  p_ddd text default null,
  p_bairro text default null,
  p_state text default null,
  p_campaign_at timestamptz default now()
) returns void language plpgsql as $$
begin
  insert into crm_leads (phone, name, ddd, bairro, state, score, total_received, last_campaign_at)
  values (p_phone, p_name, p_ddd, p_bairro, p_state, p_score_delta, p_received_delta, p_campaign_at)
  on conflict (phone) do update set
    score          = crm_leads.score + excluded.score,
    total_received = crm_leads.total_received + excluded.total_received,
    last_campaign_at = excluded.last_campaign_at,
    name  = coalesce(excluded.name, crm_leads.name),
    ddd   = coalesce(excluded.ddd,  crm_leads.ddd),
    bairro = coalesce(excluded.bairro, crm_leads.bairro),
    state  = coalesce(excluded.state,  crm_leads.state);
end;
$$;
