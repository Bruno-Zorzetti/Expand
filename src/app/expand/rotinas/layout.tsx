import { exigirAdmin } from "@/lib/expand-acesso";

export default async function RotinasGate({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  return <>{children}</>;
}
