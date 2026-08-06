"use client";

import { useEffect, useState } from "react";
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
type Respostas = Record<string, unknown>;

const bigInput =
  "w-full border-0 border-b-2 border-[var(--line-2)] bg-transparent px-1 py-2 text-xl text-[var(--txt)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--dim)]";

export default function ChatForm({
  orderId,
  campos,
  respostasIniciais,
  action,
  intro,
  labelEnvio = "Enviar e iniciar o projeto",
  fimTexto = "Confira as respostas e envie pra iniciarmos o seu projeto.",
}: {
  orderId: string;
  campos: Campo[];
  respostasIniciais: Respostas;
  action: (respostas: Respostas) => Promise<void>;
  intro?: string;
  labelEnvio?: string;
  fimTexto?: string;
}) {
  const supabase = createClient();
  const [r, setR] = useState<Respostas>(respostasIniciais ?? {});
  const [ordem, setOrdem] = useState<number[]>([]);
  const [atual, setAtual] = useState<number>(-1);
  const [rascunho, setRascunho] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const [subindo, setSubindo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const visivel = (c: Campo, resp: Respostas) =>
    c.tipo !== "secao" && (!c.condicao || resp[c.condicao.campo] === c.condicao.igual);
  const proximo = (from: number, resp: Respostas) => {
    for (let i = from + 1; i < campos.length; i++) if (visivel(campos[i], resp)) return i;
    return campos.length;
  };
  const totalEstimado = campos.filter((c) => c.tipo !== "secao").length || 1;

  useEffect(() => {
    setAtual(proximo(-1, r));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ir(next: number, prefill: unknown) {
    setRascunho(typeof prefill === "string" ? prefill : "");
    setMulti(Array.isArray(prefill) ? (prefill as string[]) : []);
    setErro(null);
    setAtual(next);
  }
  function responder(campo: Campo, valor: unknown, i: number) {
    const novo = { ...r, [campo.id]: valor };
    setR(novo);
    setOrdem((o) => [...o, i]);
    ir(proximo(i, novo), r[campos[proximo(i, novo)]?.id]);
  }
  function voltar() {
    if (ordem.length === 0) return;
    const ult = ordem[ordem.length - 1];
    setOrdem((o) => o.slice(0, -1));
    ir(ult, r[campos[ult].id]);
  }
  async function upload(campo: Campo, file: File, i: number) {
    setSubindo(true);
    setErro(null);
    const path = `${orderId}/${campo.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("arquivos").upload(path, file, { upsert: true });
    setSubindo(false);
    if (error) return setErro(`Falha no upload: ${error.message}`);
    responder(campo, { path, nome: file.name }, i);
  }
  function enviarTexto(campo: Campo, i: number) {
    const v = rascunho.trim();
    if (campo.obrigatorio && !v) return setErro("Esse campo é obrigatório.");
    responder(campo, v, i);
  }
  async function finalizar() {
    setEnviando(true);
    await action(r);
  }

  const acabou = atual >= campos.length;
  const campo = atual >= 0 && atual < campos.length ? campos[atual] : null;
  const numero = ordem.length + 1;
  const progresso = Math.min(100, Math.round((ordem.length / totalEstimado) * 100));

  return (
    <div className="hx-glass overflow-hidden">
      <div className="h-1 w-full bg-[var(--line)]">
        <div className="h-full hx-accent transition-all" style={{ width: `${acabou ? 100 : progresso}%` }} />
      </div>

      <div className="flex min-h-[46vh] flex-col justify-center px-6 py-10 sm:px-10">
        {campo && (
          <div key={atual} className="hx-qin">
            {ordem.length === 0 && intro && <p className="mb-4 text-sm text-[var(--mut)]">{intro}</p>}
            <p className="hx-eyebrow mb-2">
              Pergunta {numero}
              {campo.obrigatorio ? " · obrigatória" : ""}
            </p>
            <h2 className="text-2xl font-extrabold sm:text-3xl">{campo.label}</h2>
            {campo.ajuda && <p className="mt-2 text-sm text-[var(--mut)]">{campo.ajuda}</p>}

            <div className="mt-6">
              {["texto", "email", "telefone", "cnpj"].includes(campo.tipo) && (
                <div>
                  <input
                    autoFocus
                    value={rascunho}
                    onChange={(e) => setRascunho(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && enviarTexto(campo, atual)}
                    type={campo.tipo === "email" ? "email" : "text"}
                    placeholder="Digite sua resposta..."
                    className={bigInput}
                  />
                  <button onClick={() => enviarTexto(campo, atual)} className="hx-btn hx-btn-primary mt-5">
                    OK <Icon name="check" size={15} />
                  </button>
                  <span className="ml-3 text-xs text-[var(--dim)]">ou pressione Enter</span>
                </div>
              )}

              {campo.tipo === "paragrafo" && (
                <div>
                  <textarea
                    autoFocus
                    value={rascunho}
                    onChange={(e) => setRascunho(e.target.value)}
                    rows={3}
                    placeholder="Escreva aqui..."
                    className="w-full rounded-xl border-2 border-[var(--line-2)] bg-transparent px-3 py-2.5 text-lg text-[var(--txt)] outline-none focus:border-[var(--accent)]"
                  />
                  <button onClick={() => enviarTexto(campo, atual)} className="hx-btn hx-btn-primary mt-4">
                    OK <Icon name="check" size={15} />
                  </button>
                </div>
              )}

              {campo.tipo === "radio" && (
                <div className="space-y-2">
                  {(campo.opcoes ?? []).map((o, k) => (
                    <button
                      key={o}
                      onClick={() => responder(campo, o, atual)}
                      className="flex w-full items-center gap-3 rounded-xl border-2 border-[var(--line-2)] px-4 py-3 text-left text-base hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--line-2)] text-xs font-bold text-[var(--mut)]">
                        {String.fromCharCode(65 + k)}
                      </span>
                      {o}
                    </button>
                  ))}
                </div>
              )}

              {campo.tipo === "checkbox" && (
                <div>
                  <div className="space-y-2">
                    {(campo.opcoes ?? []).map((o, k) => {
                      const on = multi.includes(o);
                      return (
                        <button
                          key={o}
                          onClick={() => setMulti((m) => (on ? m.filter((x) => x !== o) : [...m, o]))}
                          className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base ${
                            on ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]" : "border-[var(--line-2)] hover:border-[var(--accent)]"
                          }`}
                        >
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${on ? "hx-accent text-white" : "border border-[var(--line-2)] text-[var(--mut)]"}`}>
                            {on ? <Icon name="check" size={13} /> : String.fromCharCode(65 + k)}
                          </span>
                          {o}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      if (campo.obrigatorio && multi.length === 0) return setErro("Escolha ao menos uma opção.");
                      responder(campo, multi, atual);
                    }}
                    className="hx-btn hx-btn-primary mt-4"
                  >
                    Continuar
                  </button>
                </div>
              )}

              {campo.tipo === "arquivo" && (
                <div className="flex flex-wrap items-center gap-4">
                  <input
                    type="file"
                    onChange={(e) => e.target.files?.[0] && upload(campo, e.target.files[0], atual)}
                    className="text-sm text-[var(--mut)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--panel-2)] file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-[var(--txt)]"
                  />
                  {subindo && <span className="text-xs text-[var(--mut)]">Enviando...</span>}
                  {!campo.obrigatorio && (
                    <button onClick={() => responder(campo, "", atual)} className="text-sm text-[var(--mut)] hover:text-[var(--txt)]">
                      Pular
                    </button>
                  )}
                </div>
              )}
            </div>

            {erro && <p className="mt-3 text-sm text-[var(--red)]">{erro}</p>}

            {ordem.length > 0 && (
              <button onClick={voltar} className="mt-6 text-sm text-[var(--mut)] hover:text-[var(--txt)]">
                ← Voltar
              </button>
            )}
          </div>
        )}

        {acabou && (
          <div className="hx-qin text-center">
            <Icon name="checkCircle" size={48} strokeWidth={1.5} className="mx-auto text-[var(--accent)]" />
            <h2 className="mt-4 text-2xl font-extrabold">Tudo pronto!</h2>
            <p className="mt-2 text-[var(--mut)]">{fimTexto}</p>
            <button onClick={finalizar} disabled={enviando} className="hx-btn hx-btn-primary mx-auto mt-6 disabled:opacity-60">
              {enviando ? "Enviando..." : labelEnvio}
            </button>
            <button onClick={voltar} className="mt-3 block w-full text-xs text-[var(--mut)] hover:text-[var(--txt)]">
              ← Revisar última resposta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
