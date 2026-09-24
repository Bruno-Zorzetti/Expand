-- Tabela de leituras: marca a última vez que um usuário leu cada room
CREATE TABLE IF NOT EXISTS expand_chat_leituras (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_key TEXT NOT NULL,
  lido_em TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, room_key)
);

ALTER TABLE expand_chat_leituras ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='expand_chat_leituras' AND policyname='leituras_owner') THEN
    CREATE POLICY "leituras_owner" ON expand_chat_leituras FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- FTS index para busca de mensagens
CREATE INDEX IF NOT EXISTS idx_chat_fts ON expand_chat_mensagens
  USING gin(to_tsvector('portuguese', content));
