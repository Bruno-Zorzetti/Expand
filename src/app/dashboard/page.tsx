import { redirect } from "next/navigation";

// Painel antigo (Hashes) aposentado — a área do cliente unificada vive em /cliente.
export default function Dashboard() {
  redirect("/cliente");
}
