"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

type Campo = { id: string; tipo: string; label: string; obrigatorio?: boolean; ajuda?: string; opcoes?: string[] };
type Respostas = Record<string, unknown>;

const field =
  "w-full rounded-lg border border-[var(--line-2)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--txt)] outline-none focus:border-[var(--accent)]";

export default function BriefingCompleto({
  orderId,
  campos,
  respostasIniciais,
  action,
}: {
  orderId: string;
  campos: Campo[];
  respostasIniciais: Respostas;
  action: (respostas: Respostas) => Promise<void>;
}) {
  const supabase = createClient();
  const [r, setR] = useState<Respostas>(respostasIniciais ?? {});
  const [enviando, setEnviando] = useState(false);
  const [subindo, setSubindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const set = (id: string, v: unknown) => setR((s) => ({ ...s, [id]: v }));

  function toggleCheck(id: string, opt: string) {
    setR((s) => {
      const arr = Array.isArray(s[id]) ? [...(s[id] as string[])] : [];
      const i = arr.indexOf(opt);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(opt);
      return { ...s, [id]: arr };
    });
  }

  async function upload(id: string, file: File) {
    setSubindo(id);
    setErro(null);
    const path = `${orderId}/${id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("arquivos").upload(path, file, { upsert: true });
    setSubindo(null);
    if (error) {
      setErro(`Falha no upload de ${file.name}: ${error.message}`);
      return;
    }
    set(id, { path, nome: file.name });
  }

  function faltando(): string | null {
    for (const c of campos) {
      if (c.tipo === "secao" || !c.obrigatorio) continue;
      const v = r[c.id];
      const vazio =
        v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
      if (vazio) return c.label;
    }
    return null;
  }

  async function enviar() {
    const falta = faltando();
    if (falta) {
      setErro(`Preencha: ${falta}`);
      return;
    }
    setErro(null);
    setEnviando(true);
    await action(r);
  }

  return (
    <div className="space-y-4">
      {campos.map((c) => {
        if (c.tipo === "secao") {
          return (
            <h2 key={c.id} className="pt-4 text-lg font-bold text-[var(--txt)]">
              {c.label}
            </h2>
          );
        }
        const val = r[c.id];
        return (
          <div key={c.id} className="hx-glass p-4">
            <label className="block text-sm font-semibold">
              {c.label} {c.obrigatorio && <span className="text-[var(--red)]">*</span>}
            </label>
            {c.ajuda && <p className="mb-2 mt-0.5 text-xs text-[var(--mut)]">{c.ajuda}</p>}

            {["texto", "email", "telefone", "cnpj"].includes(c.tipo) && (
              <input
                value={(val as string) ?? ""}
                onChange={(e) => set(c.id, e.target.value)}
                type={c.tipo === "email" ? "email" : "text"}
                className={`${field} mt-1`}
              />
            )}

            {c.tipo === "paragrafo" && (
              <textarea value={(val as string) ?? ""} onChange={(e) => set(c.id, e.target.value)} rows={3} className={`${field} mt-1`} />
            )}

            {c.tipo === "radio" && (
              <div className="mt-2 space-y-1.5">
                {(c.opcoes ?? []).map((o) => (
                  <label key={o} className="flex items-center gap-2 text-sm">
                    <input type="radio" name={c.id} checked={val === o} onChange={() => set(c.id, o)} />
                    {o}
                  </label>
                ))}
              </div>
            )}

            {c.tipo === "checkbox" && (
              <div className="mt-2 space-y-1.5">
                {(c.opcoes ?? []).map((o) => (
                  <label key={o} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={Array.isArray(val) && (val as string[]).includes(o)} onChange={() => toggleCheck(c.id, o)} />
                    {o}
                  </label>
                ))}
              </div>
            )}

            {c.tipo === "arquivo" && (
              <div className="mt-1">
                <input
                  type="file"
                  onChange={(e) => e.target.files?.[0] && upload(c.id, e.target.files[0])}
                  className="block w-full text-sm text-[var(--mut)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--panel-2)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--txt)]"
                />
                {subindo === c.id && <p className="mt-1 text-xs text-[var(--mut)]">Enviando...</p>}
                {Boolean(val) && typeof val === "object" && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-[var(--green)]">
                    <Icon name="check" size={13} /> {(val as { nome: string }).nome}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {erro && <p className="text-sm text-[var(--red)]">{erro}</p>}

      <button onClick={enviar} disabled={enviando || !!subindo} className="hx-btn hx-btn-primary w-full justify-center disabled:opacity-60">
        {enviando ? "Enviando..." : "Enviar briefing e iniciar o projeto"}
      </button>
      <p className="text-center text-xs text-[var(--dim)]">
        O prazo de entrega começa a contar a partir do envio deste briefing.
      </p>
    </div>
  );
}
