import { createClient } from "@supabase/supabase-js";
const s = createClient(
  "https://gfoirncqxrjxzcfcxuga.supabase.co",
  "sb_publishable_MKokRAG5enGE7dLIoDVRmg_-H9bB11e",
);
const email = `check_${Date.now()}@hashes.com.br`;
const { data, error } = await s.auth.signUp({
  email,
  password: "HashesTeste123",
  options: { data: { full_name: "Check Signup" } },
});
if (error) console.log("ERRO:", error.message);
else console.log("signup OK | session (confirmacao OFF se true):", !!data.session);
