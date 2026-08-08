import { exigirAdmin } from "@/lib/expand-acesso";

// Rota sensível — só admin (diretoria). O resto é redirecionado ao Meu Dia.
export default async function AdminGate({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  return <>{children}</>;
}
