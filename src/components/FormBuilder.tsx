"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

type Campo = {
  id: string;
  tipo: string;
  label: string;
  obrigatorio?: boolean;
  ajuda?: string;
  opcoes?: string[];
  condicao?: { campo: string; igual: string };
};

const TIPOS: { v: string; l: string }[] = [
  { v: "texto", l: "Texto curto" },
  { v: "paragrafo", l: "Parágrafo" },
  { v: "email", l: "E-mail" },
  { v: "telefone", l: "Telefone" },
  { v: "cnpj", l: "CNPJ" },
  { v: "radio", l: "Múltipla escolha" },
  { v: "checkbox", l: "Caixas de seleção" },
  { v: "arquivo", l: "Arquivo / upload" },
  { v: "secao", l: "Seção (título)" },
];

const field =
  "w-full rounded-lg border border-[var(--line-2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--txt)] outline-none focus:border-[var(--accent)]";

export default function FormBuilder({
  slug,
  tituloInicial,
  camposIniciais,
}: {
  slug: string;
  tituloInicial: string;
  camposIniciais: Campo[];
}) {
  const supabase = createClient();
  const [titulo, setTitulo] = useState(tituloInicial);
  const [campos, setCampos] = useState<Campo[]>(camposIniciais);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function upd(i: number, patch: Partial<Campo>) {
    setCampos((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }
  function mover(i: number, dir: -1 | 1) {
    setCampos((cs) => {
      const j = i + dir;
      if (j < 0 || j >= cs.length) return cs;
      const copy = [...cs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  function remover(i: number) {
    setCampos((cs) => cs.filter((_, j) => j !== i));
  }
  function adicionar() {
    const id = `campo_${Date.now().toString(36)}`;
    setCampos((cs) => [...cs, { id, tipo: "texto", label: "Nova pergunta", obrigatorio: false }]);
  }

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    const limpos = campos.map((c) => ({
      ...c,
      opcoes: ["radio", "checkbox"].includes(c.tipo) ? c.opcoes ?? [] : undefined,
    }));
    const { error } = await supabase
      .from("form_defs")
      .update({ titulo, campos: limpos, updated_at: new Date().toISOString() })
      .eq("slug", slug);
    setSalvando(false);
    setMsg(error ? `Erro: ${error.message}` : "Formulário salvo.");
  }

  return (
    <div>
      <div className="hx-glass mb-4 flex flex-wrap items-center gap-3 p-4">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={`${field} max-w-md flex-1`}
          placeholder="Título do formulário"
        />
        <span className="text-xs text-[var(--mut)]">{campos.length} campos</span>
        <button onClick={salvar} disabled={salvando} className="hx-btn hx-btn-primary ml-auto">
          <Icon name="check" size={15} /> {salvando ? "Salvando..." : "Salvar formulário"}
        </button>
        {msg && <span className="w-full text-sm text-[var(--mut)]">{msg}</span>}
      </div>

      <div className="space-y-3">
        {campos.map((c, i) => (
          <div key={c.id} className="hx-glass p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="hx-eyebrow">#{i + 1}</span>
              <input value={c.label} onChange={(e) => upd(i, { label: e.target.value })} className={`${field} min-w-0 flex-1`} placeholder="Pergunta" />
              <select value={c.tipo} onChange={(e) => upd(i, { tipo: e.target.value })} className={`${field} w-auto`}>
                {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <button onClick={() => mover(i, -1)} className="hx-btn hx-btn-ghost px-2 py-1" title="Subir" aria-label="Subir">↑</button>
                <button onClick={() => mover(i, 1)} className="hx-btn hx-btn-ghost px-2 py-1" title="Descer" aria-label="Descer">↓</button>
                <button onClick={() => remover(i)} className="hx-btn hx-btn-ghost px-2 py-1 text-[var(--red)]" title="Remover" aria-label="Remover">
                  <Icon name="alert" size={14} />
                </button>
              </div>
            </div>

            {c.tipo !== "secao" && (
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input value={c.ajuda ?? ""} onChange={(e) => upd(i, { ajuda: e.target.value })} className={field} placeholder="Texto de ajuda (opcional)" />
                <label className="flex items-center gap-2 whitespace-nowrap px-2 text-sm text-[var(--mut)]">
                  <input type="checkbox" checked={!!c.obrigatorio} onChange={(e) => upd(i, { obrigatorio: e.target.checked })} />
                  Obrigatório
                </label>
              </div>
            )}

            {c.tipo !== "secao" && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--mut)]">
                <Icon name="target" size={12} />
                <span>Mostrar só se</span>
                <select
                  value={c.condicao?.campo ?? ""}
                  onChange={(e) =>
                    upd(i, {
                      condicao: e.target.value
                        ? { campo: e.target.value, igual: c.condicao?.igual ?? "" }
                        : undefined,
                    })
                  }
                  className={`${field} w-auto`}
                >
                  <option value="">(sempre visível)</option>
                  {campos
                    .filter((x, j) => j !== i && x.tipo !== "secao")
                    .map((x) => (
                      <option key={x.id} value={x.id}>{x.label}</option>
                    ))}
                </select>
                {c.condicao?.campo && (
                  <>
                    <span>for igual a</span>
                    <input
                      value={c.condicao.igual}
                      onChange={(e) => upd(i, { condicao: { campo: c.condicao!.campo, igual: e.target.value } })}
                      className={`${field} w-40`}
                      placeholder="valor exato"
                    />
                  </>
                )}
              </div>
            )}

            {["radio", "checkbox"].includes(c.tipo) && (
              <div className="mt-2">
                <label className="hx-eyebrow">Opções (uma por linha)</label>
                <textarea
                  value={(c.opcoes ?? []).join("\n")}
                  onChange={(e) => upd(i, { opcoes: e.target.value.split("\n").map((s) => s.trimStart()).filter((s, k, a) => s !== "" || k < a.length - 1) })}
                  rows={Math.max(2, (c.opcoes ?? []).length)}
                  className={`${field} mt-1`}
                  placeholder={"Opção 1\nOpção 2"}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={adicionar} className="hx-btn hx-btn-ghost mt-4">
        + Adicionar pergunta
      </button>
    </div>
  );
}
