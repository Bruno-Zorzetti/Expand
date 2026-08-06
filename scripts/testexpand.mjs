import { createClient } from "@supabase/supabase-js";
const s = createClient("https://gfoirncqxrjxzcfcxuga.supabase.co", "sb_publishable_MKokRAG5enGE7dLIoDVRmg_-H9bB11e");
await s.auth.signInWithPassword({ email: "teste@hashes.com.br", password: "HashesTeste123" });
const order_id = "b1d95b27-9836-4968-af08-d49667d8e685";
console.time("diag");
const { data, error } = await s.functions.invoke("diagnostico-gbp", { body: { order_id } });
console.timeEnd("diag");
if (error || data?.error) { console.log("ERRO:", error?.message || data?.error); process.exit(1); }
const d = data.diagnostico.dados;
console.log("SCORE:", d.score, "| Perfil:", d.snapshot.title);
console.log("AVALIAÇÕES:", JSON.stringify(d.avaliacoes));
console.log("FOTOS URLs:", (d.snapshot.fotosUrls||[]).length);
console.log("REVIEWS amostra:", (d.reviews||[]).length);
for (const r of (d.reviews||[])) console.log(`  - ${r.autor} (${r.estrelas}★) ${r.data||"sem data"} | resp:${r.resposta?"sim":"não"} | ${(r.texto||"").slice(0,50)}`);
