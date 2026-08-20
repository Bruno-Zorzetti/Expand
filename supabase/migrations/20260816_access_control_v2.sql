-- ============================================================
-- Controle de Acessos v2 — modelo multidimensional
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. Configuração de agente + tokens + horário por usuário
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expand_user_config (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_agent      TEXT,                          -- slug do agente mentor (ex: 'teo', 'bia')
  agents_allowed    TEXT[],                        -- NULL = todos; lista = só estes slugs
  agents_blocked    TEXT[],                        -- sempre bloqueados (ex: ['financeiro'])
  token_limit_day   INT,                           -- NULL = sem limite
  token_limit_month INT,
  tokens_today      INT NOT NULL DEFAULT 0,        -- contador reset diário
  tokens_month      INT NOT NULL DEFAULT 0,        -- contador reset mensal
  access_days       TEXT[] NOT NULL DEFAULT ARRAY['seg','ter','qua','qui','sex'],
  access_start      TIME,                          -- NULL = sem restrição de horário
  access_end        TIME,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Usuário ↔ Clientes (many-to-many com papel no cliente)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expand_user_clientes (
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id        UUID REFERENCES expand_clientes(id) ON DELETE CASCADE,
  funcao_cliente    TEXT NOT NULL DEFAULT 'colaborador', -- responsavel | colaborador | viewer
  PRIMARY KEY (user_id, cliente_id)
);

-- 3. Usuário ↔ Funções/Papéis (many-to-many)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expand_user_funcoes (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  funcao  TEXT NOT NULL,  -- sdr | closer | cs | pmo | designer | financeiro | juridico | ops
  PRIMARY KEY (user_id, funcao)
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE expand_user_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE expand_user_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expand_user_funcoes  ENABLE ROW LEVEL SECURITY;

-- Admin lê e escreve tudo
CREATE POLICY "admin_all_user_config"   ON expand_user_config   FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all_user_clientes" ON expand_user_clientes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all_user_funcoes"  ON expand_user_funcoes  FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Cada usuário lê a própria config
CREATE POLICY "self_read_config"    ON expand_user_config   FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "self_read_clientes"  ON expand_user_clientes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "self_read_funcoes"   ON expand_user_funcoes  FOR SELECT USING (user_id = auth.uid());

-- ── RPC principal: admin salva config completa ───────────────
CREATE OR REPLACE FUNCTION admin_salvar_config_usuario(
  p_user_id         UUID,
  p_role            TEXT,
  p_membro          TEXT,           -- expand_perfis.id ou null
  p_acessos_extras  TEXT[],         -- ['comercial','pmo',...]
  p_cliente_ids     TEXT[],         -- UUIDs dos clientes vinculados
  p_funcoes         TEXT[],         -- ['sdr','cs',...]
  p_mentor_agent    TEXT,
  p_agents_allowed  TEXT[],
  p_agents_blocked  TEXT[],
  p_token_limit_day INT,
  p_token_limit_month INT,
  p_access_days     TEXT[],
  p_access_start    TEXT,           -- 'HH:MM' ou null
  p_access_end      TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start TIME := CASE WHEN p_access_start = '' OR p_access_start IS NULL THEN NULL ELSE p_access_start::TIME END;
  v_end   TIME := CASE WHEN p_access_end   = '' OR p_access_end   IS NULL THEN NULL ELSE p_access_end::TIME   END;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Apenas admin pode alterar configurações de acesso';
  END IF;

  -- Atualiza role + membro no profiles
  UPDATE profiles
  SET role = p_role,
      expand_membro = CASE WHEN p_membro = '' THEN NULL ELSE p_membro::UUID END,
      acessos = p_acessos_extras
  WHERE id = p_user_id;

  -- Upsert config de agente/token/horário
  INSERT INTO expand_user_config (
    user_id, mentor_agent, agents_allowed, agents_blocked,
    token_limit_day, token_limit_month,
    access_days, access_start, access_end
  ) VALUES (
    p_user_id, NULLIF(p_mentor_agent,''), p_agents_allowed, p_agents_blocked,
    p_token_limit_day, p_token_limit_month,
    COALESCE(p_access_days, ARRAY['seg','ter','qua','qui','sex']), v_start, v_end
  )
  ON CONFLICT (user_id) DO UPDATE SET
    mentor_agent      = EXCLUDED.mentor_agent,
    agents_allowed    = EXCLUDED.agents_allowed,
    agents_blocked    = EXCLUDED.agents_blocked,
    token_limit_day   = EXCLUDED.token_limit_day,
    token_limit_month = EXCLUDED.token_limit_month,
    access_days       = EXCLUDED.access_days,
    access_start      = EXCLUDED.access_start,
    access_end        = EXCLUDED.access_end,
    updated_at        = NOW();

  -- Substituir vínculos com clientes
  DELETE FROM expand_user_clientes WHERE user_id = p_user_id;
  IF array_length(p_cliente_ids, 1) > 0 THEN
    INSERT INTO expand_user_clientes (user_id, cliente_id)
    SELECT p_user_id, unnest(p_cliente_ids)::UUID
    ON CONFLICT DO NOTHING;
  END IF;

  -- Substituir funções
  DELETE FROM expand_user_funcoes WHERE user_id = p_user_id;
  IF array_length(p_funcoes, 1) > 0 THEN
    INSERT INTO expand_user_funcoes (user_id, funcao)
    SELECT p_user_id, unnest(p_funcoes)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- ── RPC de listagem atualizado ───────────────────────────────
CREATE OR REPLACE FUNCTION admin_listar_perfis_v2()
RETURNS TABLE (
  id            UUID,
  full_name     TEXT,
  email         TEXT,
  role          TEXT,
  expand_membro TEXT,
  acessos       TEXT[],
  created_at    TIMESTAMPTZ,
  tipo_acesso   TEXT,
  -- config
  mentor_agent    TEXT,
  agents_allowed  TEXT[],
  agents_blocked  TEXT[],
  token_limit_day INT,
  token_limit_month INT,
  tokens_today    INT,
  tokens_month    INT,
  access_days     TEXT[],
  access_start    TEXT,
  access_end      TEXT,
  -- relacionamentos
  cliente_ids   TEXT[],
  funcoes       TEXT[]
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.expand_membro::TEXT,
    p.acessos,
    p.created_at,
    CASE
      WHEN ep.tipo = 'humano'  THEN 'equipe'
      WHEN ec.id IS NOT NULL   THEN 'cliente'
      ELSE NULL
    END AS tipo_acesso,
    uc.mentor_agent,
    uc.agents_allowed,
    uc.agents_blocked,
    uc.token_limit_day,
    uc.token_limit_month,
    uc.tokens_today,
    uc.tokens_month,
    uc.access_days,
    uc.access_start::TEXT,
    uc.access_end::TEXT,
    ARRAY(SELECT cliente_id::TEXT FROM expand_user_clientes WHERE user_id = p.id) AS cliente_ids,
    ARRAY(SELECT funcao FROM expand_user_funcoes WHERE user_id = p.id) AS funcoes
  FROM profiles p
  LEFT JOIN expand_perfis ep ON ep.id = p.expand_membro AND ep.tipo = 'humano'
  LEFT JOIN expand_clientes ec ON ec.id = p.expand_cliente
  LEFT JOIN expand_user_config uc ON uc.user_id = p.id
  ORDER BY
    CASE p.role WHEN 'pendente' THEN 0 WHEN 'admin' THEN 1 WHEN 'equipe' THEN 2 ELSE 3 END,
    p.full_name;
$$;

GRANT EXECUTE ON FUNCTION admin_listar_perfis_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION admin_salvar_config_usuario TO authenticated;
