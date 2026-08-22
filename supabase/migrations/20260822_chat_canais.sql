-- Canal table
CREATE TABLE IF NOT EXISTS expand_chat_canais (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'canal',
  icone TEXT DEFAULT '#',
  publico BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

INSERT INTO expand_chat_canais (id, nome, descricao) VALUES
  ('geral',     'geral',     'Canal principal da equipe Expand'),
  ('clientes',  'clientes',  'Discussões sobre clientes e contas'),
  ('comercial', 'comercial', 'Pipeline, deals e oportunidades'),
  ('projetos',  'projetos',  'Demandas, entregas e status'),
  ('duvidas',   'dúvidas',   'Pedir ajuda, reportar erros e bloqueios')
ON CONFLICT (id) DO NOTHING;

-- Update messages table
ALTER TABLE expand_chat_mensagens ALTER COLUMN agente_id DROP NOT NULL;
ALTER TABLE expand_chat_mensagens
  ADD COLUMN IF NOT EXISTS canal_id TEXT REFERENCES expand_chat_canais(id),
  ADD COLUMN IF NOT EXISTS mencoes TEXT[],
  ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES expand_chat_mensagens(id);

CREATE INDEX IF NOT EXISTS idx_chat_canal ON expand_chat_mensagens(canal_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_chat_dm    ON expand_chat_mensagens(agente_id, criado_em);

-- Behavioral analysis table (PMO/admin only)
CREATE TABLE IF NOT EXISTS expand_chat_analise (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  perfil_id TEXT NOT NULL REFERENCES expand_perfis(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  mensagens_analisadas INT DEFAULT 0,
  humor TEXT,
  energia INT,
  alinhamento INT,
  topicos TEXT[],
  clientes_mencionados TEXT[],
  alertas TEXT[],
  resumo TEXT,
  raw_insights JSONB,
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(perfil_id, periodo)
);

ALTER TABLE expand_chat_analise ENABLE ROW LEVEL SECURITY;

-- RLS policies (use DO block to avoid duplicate errors)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='expand_chat_analise' AND policyname='analise_admin_pmo') THEN
    CREATE POLICY "analise_admin_pmo" ON expand_chat_analise FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR (p.expand_modulos IS NOT NULL AND 'pmo' = ANY(p.expand_modulos))))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='expand_chat_canais' AND policyname='canais_equipe_read') THEN
    CREATE POLICY "canais_equipe_read" ON expand_chat_canais FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','equipe'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='expand_chat_mensagens' AND policyname='chat_mensagens_equipe') THEN
    CREATE POLICY "chat_mensagens_equipe" ON expand_chat_mensagens FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','equipe'))
    );
  END IF;
END $$;
