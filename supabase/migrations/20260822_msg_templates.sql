-- Coluna para templates de mensagem WhatsApp personalizados por cliente.
-- Estrutura: { boas_vindas?: string, onboarding?: string, followup_reuniao?: string, relatorio?: string }
-- null = usar template global padrão do sistema
ALTER TABLE expand_clientes
  ADD COLUMN IF NOT EXISTS whatsapp_templates JSONB;
