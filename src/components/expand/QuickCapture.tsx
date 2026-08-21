"use client";

import { useRef, useEffect, useState } from "react";
import { criarEtapav2 } from "@/app/expand/v2/actions";

interface Props {
  clientes: { id: string; nome: string }[];
  defaultClienteId?: string;
  backUrl: string;
}

export function QuickCapture({ clientes, defaultClienteId, backUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef  = useRef<HTMLFormElement>(null);
  const [focused, setFocused] = useState(false);
  const [title, setTitle]     = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.key === "n" || e.key === "N") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && focused) inputRef.current?.blur();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [focused]);

  return (
    <form
      ref={formRef}
      action={criarEtapav2}
      onSubmit={() => setTitle("")}
      style={{
        position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
        zIndex: 1000, display: "flex", alignItems: "center", gap: 8,
        background: "var(--panel)",
        border: `1px solid ${focused ? "var(--accent)" : "var(--line)"}`,
        borderRadius: 40, padding: "7px 10px 7px 16px",
        boxShadow: focused
          ? "0 0 0 3px color-mix(in srgb,var(--accent) 20%,transparent), 0 8px 32px rgba(0,0,0,.35)"
          : "0 4px 20px rgba(0,0,0,.3)",
        width: "min(580px, 90vw)",
        transition: "border .15s, box-shadow .15s",
      }}
    >
      <input type="hidden" name="back" value={backUrl} />
      <span style={{ fontSize: 14, flexShrink: 0, opacity: focused ? 1 : 0.6 }}>⚡</span>
      <input
        ref={inputRef}
        name="titulo"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Nova tarefa… (atalho N)"
        autoComplete="off"
        style={{
          flex: 1, background: "transparent", border: "none", outline: "none",
          color: "var(--txt)", fontSize: 13, fontFamily: "inherit",
          minWidth: 0,
        }}
      />
      <select
        name="cliente_id"
        required
        defaultValue={defaultClienteId ?? ""}
        style={{
          background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 20,
          color: "var(--txt)", padding: "4px 8px", fontSize: 11, outline: "none",
          fontFamily: "inherit", flexShrink: 0, maxWidth: 140,
          opacity: focused ? 1 : 0.7,
        }}
      >
        <option value="">Cliente…</option>
        {clientes.map(c => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!title.trim()}
        style={{
          background: title.trim() ? "var(--accent)" : "var(--panel-2)",
          border: "none", borderRadius: 20,
          color: title.trim() ? "#fff" : "var(--dim)",
          padding: "5px 14px", fontSize: 12, cursor: title.trim() ? "pointer" : "default",
          fontFamily: "inherit", fontWeight: 700, flexShrink: 0,
          transition: "background .15s, color .15s",
        }}
      >Criar</button>
      {!focused && (
        <kbd style={{
          fontSize: 10, color: "var(--dim)", border: "1px solid var(--line-2)",
          borderRadius: 4, padding: "2px 5px", flexShrink: 0, fontFamily: "inherit",
        }}>N</kbd>
      )}
    </form>
  );
}
