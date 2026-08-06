import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://gfoirncqxrjxzcfcxuga.supabase.co",
  "sb_publishable_MKokRAG5enGE7dLIoDVRmg_-H9bB11e",
);

const { data, error } = await supabase.auth.signUp({
  email: "teste@hashes.com.br",
  password: "HashesTeste123",
  options: { data: { full_name: "Bruno Teste" } },
});

if (error) {
  console.log("ERRO:", error.message);
} else {
  console.log("OK user id:", data.user?.id, "| session:", !!data.session);
}
