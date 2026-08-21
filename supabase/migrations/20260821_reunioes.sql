-- expand_reunioes: reuniões com clientes (Google Meet + transcrição)
CREATE TABLE IF NOT EXISTS expand_reunioes (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id    TEXT        NOT NULL REFERENCES expand_clientes(id) ON DELETE CASCADE,
  titulo        TEXT        NOT NULL,
  data_hora     TIMESTAMPTZ NOT NULL,
  duracao_min   INT         NOT NULL DEFAULT 60,
  meet_link     TEXT,
  google_event_id TEXT,
  enviado_grupo BOOLEAN     NOT NULL DEFAULT false,
  transcricao   TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por    UUID        REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS expand_reunioes_cliente_data ON expand_reunioes(cliente_id, data_hora DESC);

-- RLS: somente admin lê e escreve (clientes não acessam esta tabela)
ALTER TABLE expand_reunioes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_reunioes" ON expand_reunioes
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
