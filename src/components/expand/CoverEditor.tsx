"use client";
import { useEffect } from "react";

interface FeedbackPayload {
  source: string;
  event: string;
  titulo: string;
  formato: string;
  estrelas: number;
  decisao: string;
  comentario: string;
  ts: string;
}

export default function CoverEditor() {
  useEffect(() => {
    function onMessage(ev: MessageEvent<FeedbackPayload>) {
      if (ev.data?.source !== "capa-editor" || ev.data?.event !== "feedback") return;
      const fb = ev.data;
      // TODO: salvar em expand_log ou tabela de feedback de design quando criada
      console.info("[CoverEditor] feedback recebido", fb);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <iframe
      src="/ferramentas/ebook-studio.html"
      style={{ width: "100%", height: "calc(100vh - 44px)", border: "none", display: "block" }}
      title="Ebook Studio"
    />
  );
}
