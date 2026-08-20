// Aplica a migration system_config via Supabase REST API
// Uso: node scripts/apply-migration.mjs
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente");
  process.exit(1);
}

// Usa a API de administração do Supabase para executar SQL
const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "apikey": key,
    "Authorization": `Bearer ${key}`,
  },
  body: JSON.stringify({
    query: readFileSync("supabase/migrations/20260820_system_config.sql", "utf8"),
  }),
});

if (!res.ok) {
  const txt = await res.text();
  console.error("❌ Erro:", txt);
  process.exit(1);
}
console.log("✅ Migration aplicada com sucesso");
