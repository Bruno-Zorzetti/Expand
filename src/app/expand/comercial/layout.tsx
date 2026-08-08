import { exigirComercial } from "@/lib/expand-acesso";

// Comercial — admin OU quem tem acesso 'comercial' (ex.: Luiz/CSO, Pedro/CEO).
export default async function ComercialGate({ children }: { children: React.ReactNode }) {
  await exigirComercial();
  return <>{children}</>;
}
