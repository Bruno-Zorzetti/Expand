import { exigirAdmin } from "@/lib/expand-acesso";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { CSSProperties } from "react";

export const dynamic = "force-dynamic";

const fld: CSSProperties = {
  background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
  color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, fontFamily: "inherit",
};
const label: CSSProperties = { fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 4 };

const CATEGORIAS = [
  { k: "contrato",     l: "Contrato" },
  { k: "distrato",     l: "Distrato" },
  { k: "planilha",     l: "Planilha" },
  { k: "apresentacao", l: "Apresentação" },
  { k: "outro",        l: "Outro" },
];

type Doc = { id: string; nome: string; categoria: string; descricao: string | null; storage_url: string | null; drive_file_url: string | null; drive_file_id: string | null; tamanho_bytes: number | null; criado_em: string };

async function uploadDoc(formData: FormData) {
  "use server";
  await exigirAdmin();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  if (!admin) return;

  const file = formData.get("arquivo") as File | null;
  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "outro");
  const descricao = String(formData.get("descricao") ?? "").trim() || null;

  if (!nome) return;

  if (file && file.size > 0) {
    const ext = file.name.split(".").pop() ?? "pdf";
    const path = `modelos/${categoria}/${Date.now()}-${nome.replace(/\s+/g, "_")}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage.from("expand-entregaveis").upload(path, buf, { contentType: file.type, upsert: false });
    if (!error) {
      const { data: urlData } = admin.storage.from("expand-entregaveis").getPublicUrl(path);
      await admin.from("expand_config_docs").insert({
        nome, categoria, descricao, storage_path: path, storage_url: urlData.publicUrl,
        mime_type: file.type, tamanho_bytes: file.size,
      });
    }
  } else {
    // Apenas metadados (sem arquivo)
    await admin.from("expand_config_docs").insert({ nome, categoria, descricao });
  }

  revalidatePath("/expand/config/empresa");
}

async function excluirDoc(formData: FormData) {
  "use server";
  await exigirAdmin();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  if (!admin) return;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const { data } = await admin.from("expand_config_docs").select("storage_path").eq("id", id).single();
  if (data?.storage_path) await admin.storage.from("expand-entregaveis").remove([data.storage_path as string]);
  await admin.from("expand_config_docs").delete().eq("id", id);
  revalidatePath("/expand/config/empresa");
}

async function vincularDrive(formData: FormData) {
  "use server";
  await exigirAdmin();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  if (!admin) return;
  const id = String(formData.get("id") ?? "");
  const drive_file_id = String(formData.get("drive_file_id") ?? "").trim() || null;
  const drive_file_url = String(formData.get("drive_file_url") ?? "").trim() || null;
  if (!id) return;
  await admin.from("expand_config_docs").update({ drive_file_id, drive_file_url }).eq("id", id);
  revalidatePath("/expand/config/empresa");
}

export default async function ConfigEmpresa({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  await exigirAdmin();
  const { t } = await searchParams;
  const aba = t ?? "documentos";

  const admin = createAdminClient();
  const { data: docs } = await admin!.from("expand_config_docs").select("*").order("categoria").order("nome");
  const documentos = (docs ?? []) as Doc[];

  const porCategoria = CATEGORIAS.map(c => ({
    ...c,
    items: documentos.filter(d => d.categoria === c.k),
  }));

  const totalDocs = documentos.length;
  const comDrive = documentos.filter(d => d.drive_file_id).length;

  const ABAS = [
    { k: "documentos", l: `Documentos (${totalDocs})` },
    { k: "planilhas",  l: "Planilhas" },
  ];

  const fmt = (bytes: number | null) => !bytes ? "" : bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p className="hx-eyebrow">Configurações</p>
        <h1 className="ex-h1">Documentos da empresa</h1>
        <p style={{ fontSize: 12.5, color: "var(--mut)", marginTop: 4 }}>
          Documentos-modelo que serão copiados automaticamente ao criar a pasta do Drive de um novo cliente.
          {comDrive > 0 && ` ${comDrive} de ${totalDocs} vinculados ao Drive.`}
        </p>
      </div>

      {/* Tabs nav */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)", marginBottom: 24 }}>
        {[
          { k: "documentos", l: `Documentos (${totalDocs})` },
          { k: "adicionar",  l: "+ Adicionar" },
        ].map(a => (
          <Link key={a.k} href={`?t=${a.k}`} style={{
            padding: "8px 14px", fontSize: 13, fontWeight: aba === a.k ? 700 : 400,
            color: aba === a.k ? "var(--txt)" : "var(--dim)", textDecoration: "none",
            borderBottom: aba === a.k ? "2px solid var(--accent)" : "2px solid transparent",
            marginBottom: -1,
          }}>{a.l}</Link>
        ))}
      </div>

      {/* ── DOCUMENTOS ── */}
      {aba === "documentos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {totalDocs === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--dim)" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
              <div style={{ fontSize: 13 }}>Nenhum documento ainda.</div>
              <Link href="?t=adicionar" style={{ color: "var(--accent)", fontSize: 12.5 }}>Adicionar primeiro documento</Link>
            </div>
          ) : (
            porCategoria.filter(c => c.items.length > 0).map(cat => (
              <div key={cat.k}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid var(--line)" }}>
                  {cat.l} ({cat.items.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {cat.items.map(doc => (
                    <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "var(--panel-2)", justifyContent: "space-between" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>{doc.nome}</div>
                        {doc.descricao && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 1 }}>{doc.descricao}</div>}
                        <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 3, display: "flex", gap: 10 }}>
                          {doc.tamanho_bytes ? <span>{fmt(doc.tamanho_bytes)}</span> : null}
                          {doc.storage_url && <a href={doc.storage_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>Storage ↗</a>}
                          {doc.drive_file_url && <a href={doc.drive_file_url} target="_blank" rel="noreferrer" style={{ color: "#4285F4" }}>Drive ↗</a>}
                          {!doc.drive_file_id && <span style={{ color: "var(--warn)" }}>Sem ID no Drive — copiar não funcionará</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {/* Vincular Drive */}
                        {!doc.drive_file_id && (
                          <form action={vincularDrive} style={{ display: "flex", gap: 4 }}>
                            <input type="hidden" name="id" value={doc.id} />
                            <input name="drive_file_id" placeholder="ID do Drive" style={{ ...fld, width: 160, fontSize: 11, padding: "5px 8px" }} />
                            <button type="submit" className="hx-btn hx-btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }}>Vincular</button>
                          </form>
                        )}
                        <form action={excluirDoc}>
                          <input type="hidden" name="id" value={doc.id} />
                          <button type="submit" style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 13, padding: "4px 6px" }} title="Excluir">✕</button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          <div style={{ padding: "14px 16px", borderRadius: 12, background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--txt)" }}>Como funciona:</strong> ao criar a estrutura de pastas de um novo cliente (Drive tab), o sistema copia automaticamente todos os documentos que tiverem um <strong>ID do Drive</strong> vinculado — contrato e distrato vão para <em>01 Documentos</em>, planilhas vão para <em>02 Planilhas</em>, apresentações para <em>03 Apresentações</em>.
          </div>
        </div>
      )}

      {/* ── ADICIONAR ── */}
      {aba === "adicionar" && (
        <form action={uploadDoc} encType="multipart/form-data" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Nome do documento *</label>
              <input name="nome" required placeholder="ex: Contrato de Prestação de Serviços" style={{ ...fld, width: "100%" }} />
            </div>
            <div>
              <label style={label}>Categoria *</label>
              <select name="categoria" style={{ ...fld, width: "100%" }}>
                {CATEGORIAS.map(c => <option key={c.k} value={c.k}>{c.l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={label}>Descrição (opcional)</label>
            <input name="descricao" placeholder="Observações ou instrução de uso" style={{ ...fld, width: "100%" }} />
          </div>

          <div>
            <label style={label}>Arquivo</label>
            <input type="file" name="arquivo" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" style={{ ...fld, width: "100%", cursor: "pointer" }} />
            <span style={{ fontSize: 11, color: "var(--dim)", display: "block", marginTop: 4 }}>
              PDF, Word, Excel, PowerPoint. Máximo 20MB. Será salvo no Supabase Storage.
            </span>
          </div>

          <div style={{ paddingTop: 4, display: "flex", gap: 10 }}>
            <button type="submit" className="hx-btn hx-btn-primary" style={{ padding: "10px 24px" }}>Salvar documento</button>
            <Link href="?t=documentos" className="hx-btn hx-btn-ghost" style={{ padding: "10px 20px" }}>Cancelar</Link>
          </div>
        </form>
      )}
    </div>
  );
}
