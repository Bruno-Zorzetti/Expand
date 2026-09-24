import { exigirAdmin } from "@/lib/expand-acesso";
import ImovelForm from "../ImovelForm";
import { criarImovel } from "../actions";

export default async function NovoImovelPage() {
  await exigirAdmin();
  return (
    <>
      <p className="hx-eyebrow">VMA · Imóveis</p>
      <h1 className="ex-h1">Novo imóvel</h1>
      <p className="ex-sub" style={{ marginBottom: 28 }}>
        Preencha os dados abaixo. Fotos podem ser adicionadas como URLs.
      </p>
      <ImovelForm action={criarImovel} submitLabel="Criar e publicar" />
    </>
  );
}
