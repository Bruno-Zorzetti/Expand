@AGENTS.md

# Regras de sessão — Plataforma Expand

## Verificação de tarefas pendentes (obrigatório no início de cada sessão)

Ao iniciar qualquer sessão neste projeto, executar imediatamente:

```sql
SELECT e.id, e.titulo, e.status, e.data_prevista, e.area, c.nome AS cliente
FROM expand_etapas e
LEFT JOIN expand_clientes c ON c.id = e.cliente_id
WHERE e.agente = 'claude-code' AND e.status IN ('idle', 'run')
ORDER BY e.data_prevista ASC NULLS LAST
LIMIT 10;
```

Via Supabase MCP (`project_id = gfoirncqxrjxzcfcxuga`).

- Se houver tarefas `idle` com `data_prevista <= hoje`: executar a mais urgente ANTES de qualquer outra coisa.
- Se houver tarefas `run` sem `concluida_em`: verificar o que está travado.
- Ao concluir uma tarefa: `UPDATE expand_etapas SET status='done', concluida_em=now() WHERE id='...'`

Esta regra substitui o sistema `hashes-pipeline-trigger` — toda verificação diária de tarefas de agentes passa por aqui.

## Convenções do projeto

- Supabase: `gfoirncqxrjxzcfcxuga`
- URL de produção: `https://expand.hshs.com.br`
- Portal do cliente: `/expand/clientes/[id]` (não `/portal/[id]`)
- `siteUrl()` ignora `VERCEL_URL` — usa `NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → `expand.hshs.com.br`
- Tarefas de agentes de IA (Bia, Téo, etc.) rodam via Vercel Cron às 8h (`/api/rotinas/tarefas-agentes`)
