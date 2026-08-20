"use client";

import { useRef, useState, useTransition } from "react";
import type { Perfil } from "@/lib/expand-perfis";
import PerfilAvatar from "./PerfilAvatar";

export default function AvatarFotoUpload({
  p,
  size,
  radius,
  salvarFoto,
}: {
  p: Pick<Perfil, "foto_url" | "cor" | "tipo" | "nome">;
  size: number;
  radius: number;
  salvarFoto: (url: string) => Promise<void>;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(p.foto_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setPreviewUrl(ev.target.result as string);
      };
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append("foto", file);

      const res = await fetch("/api/expand/upload-foto", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const { url } = await res.json();
        setPreviewUrl(url);
        startTransition(() => { salvarFoto(url); });
      }
    } finally {
      setUploading(false);
    }
  }

  const pCom = { ...p, foto_url: previewUrl };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <PerfilAvatar p={pCom} size={size} radius={radius} />

      {/* Overlay de câmera */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="Alterar foto"
        style={{
          position: "absolute", inset: 0, borderRadius: radius,
          background: uploading
            ? "rgba(0,0,0,.55)"
            : "rgba(0,0,0,0)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", border: "none", transition: ".2s", color: "#fff", fontSize: 22,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,.52)"; }}
        onMouseLeave={(e) => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0)"; }}
      >
        {uploading ? "⏳" : "📷"}
      </button>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
    </div>
  );
}
