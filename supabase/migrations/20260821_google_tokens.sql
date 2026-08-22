-- Tokens Google Calendar por perfil (equipe e clientes)
CREATE TABLE IF NOT EXISTS expand_google_tokens (
  perfil_id   TEXT        PRIMARY KEY REFERENCES expand_perfis(id) ON DELETE CASCADE,
  access_token  TEXT      NOT NULL,
  refresh_token TEXT,
  email         TEXT,
  scopes        TEXT,
  connected_at  TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Admin lê/escreve tudo
ALTER TABLE expand_google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON expand_google_tokens
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Equipe lê apenas o próprio token (via expand_membro)
CREATE POLICY "equipe_own_read" ON expand_google_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin','equipe')
        AND expand_membro = perfil_id
    )
  );

-- Service role bypassa RLS
CREATE POLICY "service_all" ON expand_google_tokens
  FOR ALL USING (auth.role() = 'service_role');
