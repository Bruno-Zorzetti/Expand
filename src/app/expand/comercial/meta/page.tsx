import { createClient } from "@/lib/supabase/server";
import { PADRAO, type Plano } from "@/lib/expand-comercial-game";
import { salvarPlano } from "@/app/expand/comercial/actions";
import MetaCalc from "@/components/expand/MetaCalc";

export const dynamic = "force-dynamic";

export default async function AMeta() {
  const supabase = await createClient();
  const { data } = await supabase.from("expand_com_config").select("plano").eq("id", "main").maybeSingle();
  const plano = { ...PADRAO, ...((data?.plano as Partial<Plano>) ?? {}) } as Plano;

  return (
    <>
      <p className="hx-eyebrow">Comercial · calculadora</p>
      <h1 className="ex-h1">A Meta, em <span className="hx-accent-text">números</span></h1>
      <p className="ex-sub">O motor do plano: a meta de contratos vira ticket médio, número de vendas e o ritmo de convites, reuniões e follow-ups por dia e por semana — mais a projeção de caixa. Mude qualquer campo e veja tudo recalcular. Depois salve pra virar as metas das missões no placar.</p>
      <MetaCalc inicial={plano} salvar={salvarPlano} />
    </>
  );
}
