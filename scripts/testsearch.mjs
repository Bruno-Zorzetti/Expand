import { createClient } from "@supabase/supabase-js";
const s = createClient(
  "https://gfoirncqxrjxzcfcxuga.supabase.co",
  "sb_publishable_MKokRAG5enGE7dLIoDVRmg_-H9bB11e",
);
const { error: le } = await s.auth.signInWithPassword({
  email: "teste@hashes.com.br",
  password: "HashesTeste123",
});
if (le) { console.log("LOGIN ERRO:", le.message); process.exit(1); }

const { data, error } = await s.functions.invoke("gmn-search", {
  body: { nome: "Hashes", cidade: "Cuiabá", uf: "MT" },
});
if (error) { console.log("INVOKE ERRO:", error.message); process.exit(1); }
if (data?.error) { console.log("FUNC ERRO:", data.error); process.exit(1); }
console.log("OK | matches:", (data.matches ?? []).length);
for (const m of data.matches ?? []) {
  console.log(" -", m.title, "|", m.address, "|", m.categoria);
}
