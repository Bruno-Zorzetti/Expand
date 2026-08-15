"use client";

import { useActionState, useState } from "react";

type Cli = { id: string; nome: string; drive: string | null; inicio?: string | null; alterado?: string | null };
type Res = { jid?: string; link?: string; nome?: string; avisos?: string[]; erro?: string } | null;

// Dados institucionais (edite com os oficiais da Expand).
const EMPRESA = {
  instagram: "https://instagram.com/grupoexpand",
  linkedin: "https://www.linkedin.com/company/grupoexpand",
  telefones: "PMO/Atendimento: (preencha) · Suporte: (preencha)",
};
const fmtData = (s?: string | null) => (s ? new Date(s.length <= 10 ? s + "T12:00" : s).toLocaleDateString("pt-BR") : "—");

const fld: React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "10px 12px", fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
const lab: React.CSSProperties = { fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", fontWeight: 700, marginBottom: 5, display: "block" };

export default function CriarGrupo({ clientes, siteUrl, criar }: { clientes: Cli[]; siteUrl: string; criar: (p: Res, fd: FormData) => Promise<Res> }) {
  const [res, action, pend] = useActionState<Res, FormData>(criar, null);
  const [cliId, setCliId] = useState("");
  const [nome, setNome] = useState("");
  const [desc, setDesc] = useState("");

  function aoTrocarCliente(id: string) {
    setCliId(id);
    const c = clientes.find((x) => x.id === id);
    if (!c) return;
    if (!nome) setNome(`Oficial · ${c.nome} · Expand`);
    const base = (siteUrl || "https://expand.hshs.com.br").replace(/\/$/, "");
    const linhas = [
      `Bem-vindo(a) ao grupo oficial de trabalho — ${c.nome} · Grupo Expand 👋`,
      ``,
      `Este é o canal direto do seu projeto com a nossa equipe: alinhamos entregas, tiramos dúvidas e enviamos materiais para sua aprovação.`,
      ``,
      `📅 Início do projeto: ${fmtData(c.inicio)}`,
      `🔄 Última atualização: ${fmtData(c.alterado)}`,
      ``,
      `📁 Materiais (Google Drive): ${c.drive || "(vincule a pasta no hub do cliente)"}`,
      `✅ Aprovações e acompanhamento (sua área de cliente): ${base}/portal/${c.id}`,
      ``,
      `📞 Contatos úteis da equipe: ${EMPRESA.telefones}`,
      ``,
      `🌐 Acompanhe a Expand:`,
      `Instagram: ${EMPRESA.instagram}`,
      `LinkedIn: ${EMPRESA.linkedin}`,
    ];
    setDesc(linhas.join("\n"));
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 620 }}>
      <div>
        <label style={lab}>Cliente (opcional — vincula o grupo e monta a descrição)</label>
        <select name="clienteId" value={cliId} onChange={(e) => aoTrocarCliente(e.target.value)} style={fld}>
          <option value="">— sem vincular —</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
      <div>
        <label style={lab}>Nome do grupo</label>
        <input name="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Oficial · Cliente · Expand" style={fld} />
      </div>
      <div>
        <label style={lab}>Descrição (já vem com os links; edite à vontade)</label>
        <textarea name="descricao" value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} placeholder="Descrição do grupo…" style={{ ...fld, resize: "vertical", lineHeight: 1.5 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lab}>Participantes (números, um por linha)</label>
          <textarea name="participantes" rows={4} placeholder={"5516999911982\n5511988887777"} style={{ ...fld, resize: "vertical", fontFamily: "monospace", fontSize: 12.5 }} />
        </div>
        <div>
          <label style={lab}>Admins do grupo (números)</label>
          <textarea name="admins" rows={4} placeholder={"quem você quiser como admin"} style={{ ...fld, resize: "vertical", fontFamily: "monospace", fontSize: 12.5 }} />
        </div>
      </div>
      <div>
        <button className="hx-btn hx-btn-primary" type="submit" disabled={pend} style={{ padding: "10px 18px", fontSize: 13, opacity: pend ? 0.6 : 1 }}>{pend ? "Criando grupo…" : "Criar grupo"}</button>
      </div>

      {res?.erro && <p style={{ fontSize: 13, color: "var(--red)", margin: 0 }}>{res.erro}</p>}
      {res?.jid && (
        <div className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px", borderLeft: "3px solid var(--green)" }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, margin: "0 0 6px" }}>✅ Grupo “{res.nome}” criado</p>
          {res.link ? <p style={{ fontSize: 12.5, margin: "0 0 6px" }}>Link de convite: <a href={res.link} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{res.link}</a></p> : null}
          <p style={{ fontSize: 11.5, color: "var(--mut)", margin: 0 }}>JID: <code style={{ fontFamily: "monospace", userSelect: "all" }}>{res.jid}</code>{cliId ? " · vinculado ao cliente." : ""}</p>
          {res.avisos?.length ? <p style={{ fontSize: 11.5, color: "var(--warn)", margin: "6px 0 0" }}>Atenção: {res.avisos.join(" · ")}.</p> : null}
        </div>
      )}
    </form>
  );
}
