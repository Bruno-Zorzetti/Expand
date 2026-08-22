-- Tabela de mensagens de chat (agente-usuário e humano-humano)
-- agente_id pode ser o slug de um perfil (agente IA ou humano)
-- Para DMs humanos: agente_id = [id1, id2].sort().join(':')

CREATE TABLE IF NOT EXISTS expand_chat_mensagens (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id  TEXT        NOT NULL,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT        NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expand_chat_mensagens_ctx_idx
  ON expand_chat_mensagens (agente_id, user_id, criado_em);

ALTER TABLE expand_chat_mensagens ENABLE ROW LEVEL SECURITY;

-- Equipe lê e escreve as próprias mensagens
CREATE POLICY "equipe_own_chat"
  ON expand_chat_mensagens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin lê tudo
CREATE POLICY "admin_all_chat"
  ON expand_chat_mensagens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role bypass
CREATE POLICY "service_all_chat"
  ON expand_chat_mensagens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Coluna de personalidade para agentes em expand_perfis
ALTER TABLE expand_perfis
  ADD COLUMN IF NOT EXISTS personalidade_pesos JSONB;
