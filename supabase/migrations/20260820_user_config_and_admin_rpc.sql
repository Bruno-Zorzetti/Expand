-- Tabela de configuração por usuário (limites de tokens, horários de acesso)
CREATE TABLE IF NOT EXISTS expand_user_config (
  user_id          uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  token_limit_day  integer,
  token_limit_month integer,
  tokens_today     integer NOT NULL DEFAULT 0,
  tokens_month     integer NOT NULL DEFAULT 0,
  access_days      text[],
  access_start     time,
  access_end       time,
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE expand_user_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all" ON expand_user_config FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "self_read" ON expand_user_config FOR SELECT USING (user_id = auth.uid());

-- Função RPC para listar perfis com config de tokens
CREATE OR REPLACE FUNCTION admin_listar_perfis_v2()
RETURNS TABLE (
  id               uuid,
  full_name        text,
  email            text,
  role             text,
  expand_membro    text,
  acessos          text[],
  created_at       timestamptz,
  tipo_acesso      text,
  token_limit_day  integer,
  token_limit_month integer,
  tokens_today     integer,
  tokens_month     integer,
  access_days      text[],
  access_start     text,
  access_end       text,
  cliente_ids      text[],
  funcoes          text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.expand_membro,
    COALESCE(p.acessos, '{}'::text[]) AS acessos,
    p.created_at,
    p.tipo_acesso,
    uc.token_limit_day,
    uc.token_limit_month,
    COALESCE(uc.tokens_today, 0) AS tokens_today,
    COALESCE(uc.tokens_month, 0) AS tokens_month,
    uc.access_days,
    uc.access_start::text,
    uc.access_end::text,
    NULL::text[] AS cliente_ids,
    NULL::text[] AS funcoes
  FROM profiles p
  LEFT JOIN expand_user_config uc ON uc.user_id = p.id
  ORDER BY
    CASE p.role WHEN 'admin' THEN 0 WHEN 'equipe' THEN 1 WHEN 'cliente' THEN 2 ELSE 3 END,
    p.full_name;
$$;

GRANT EXECUTE ON FUNCTION admin_listar_perfis_v2() TO authenticated;
