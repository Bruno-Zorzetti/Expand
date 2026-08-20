-- Tabela para configurações do sistema (chaves de API, tokens, etc.)
-- Administradores podem ler/escrever; service_role acessa sempre.
create table if not exists public.system_config (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.system_config enable row level security;

create policy "admin_read_system_config"
  on public.system_config for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin_write_system_config"
  on public.system_config for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
