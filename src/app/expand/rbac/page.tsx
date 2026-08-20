import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/expand-acesso";

export const dynamic = "force-dynamic";

export default async function RBACPage() {
  await exigirAdmin();
  redirect("/expand/acessos");
}
