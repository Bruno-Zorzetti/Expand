import { exigirAdmin } from "@/lib/expand-acesso";

// Ferramentas operacionais (criar grupo, etc.) — por ora restritas ao admin.
export default async function FerramentasGate({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  return <>{children}</>;
}
