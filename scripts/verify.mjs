import { createClient } from "@supabase/supabase-js";

const s = createClient(
  "https://gfoirncqxrjxzcfcxuga.supabase.co",
  "sb_publishable_MKokRAG5enGE7dLIoDVRmg_-H9bB11e",
);

const { data: auth, error: e1 } = await s.auth.signInWithPassword({
  email: "teste@hashes.com.br",
  password: "HashesTeste123",
});
if (e1) {
  console.log("LOGIN ERRO:", e1.message);
  process.exit(1);
}
console.log("LOGIN OK, user:", auth.user.id);

const { data: prod } = await s
  .from("products")
  .select("id, slug")
  .eq("slug", "google-meu-negocio")
  .single();
console.log("PRODUTO:", prod?.slug);

const { data: order, error: e2 } = await s
  .from("orders")
  .insert({
    user_id: auth.user.id,
    product_id: prod.id,
    product_slug: prod.slug,
    dados: { negocio: "Hashes Teste", contato: "(65) 99677-9777", observacoes: "pedido de teste" },
  })
  .select()
  .single();
console.log(e2 ? "INSERT ERRO: " + e2.message : "PEDIDO CRIADO: " + order.id + " status=" + order.status);

const { data: orders } = await s
  .from("orders")
  .select("id, status, product_slug, products(name)");
console.log("MEUS PEDIDOS:", orders?.length, orders?.map((o) => o.product_slug));
