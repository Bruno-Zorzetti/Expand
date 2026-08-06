import { createClient } from "@supabase/supabase-js";
const s = createClient("https://gfoirncqxrjxzcfcxuga.supabase.co", "sb_publishable_MKokRAG5enGE7dLIoDVRmg_-H9bB11e");
const { error: le } = await s.auth.signInWithPassword({ email: "teste@hashes.com.br", password: "HashesTeste123" });
if (le) { console.log("LOGIN ERRO:", le.message); process.exit(1); }
const order_id = "8c1493b6-1980-46a7-852b-627905c726a0";
console.time("diag");
const { data, error } = await s.functions.invoke("diagnostico-gbp", { body: { order_id } });
console.timeEnd("diag");
if (error) { console.log("INVOKE ERRO:", error.message); process.exit(1); }
if (data?.error) { console.log("FUNC ERRO:", data.error); process.exit(1); }
const d = data.diagnostico.dados;
console.log("cache:", data.cache, "| SCORE:", d.score);
console.log("\nGOOGLE RECOMENDA:");
for (const x of d.sinais.filter(s=>s.categoria==="google")) console.log(`  [${x.status.padEnd(8)}] +${x.pontos} ${x.label} — ${x.valor}`);
console.log("\nNÓS RECOMENDAMOS:");
for (const x of d.sinais.filter(s=>s.categoria==="nos")) console.log(`  [${x.status.padEnd(8)}] +${x.pontos} ${x.label} — ${x.valor}`);
console.log("\nAVALIAÇÕES:", JSON.stringify(d.avaliacoes));
console.log("REVIEWS (amostra):", (d.reviews||[]).length, "→", (d.reviews||[]).map(r=>`${r.autor}(${r.estrelas}★)`).join(", "));
console.log("COMPARAÇÃO:", JSON.stringify(d.comparacao));
