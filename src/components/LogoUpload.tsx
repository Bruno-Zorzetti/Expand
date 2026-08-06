"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

export default function LogoUpload() {
  const supabase = createClient();
  const [uid, setUid] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [subindo, setSubindo] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) return;
      setUid(u.id);
      const { data: p } = await supabase.from("profiles").select("logo_url").eq("id", u.id).single();
      setUrl((p?.logo_url as string) ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload(file: File) {
    if (!uid) return;
    setSubindo(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${uid}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatares").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatares").getPublicUrl(path);
      await supabase.from("profiles").update({ logo_url: data.publicUrl }).eq("id", uid);
      setUrl(data.publicUrl);
    }
    setSubindo(false);
  }

  return (
    <div className="hx-glass p-5">
      <p className="hx-eyebrow mb-3">Sua marca</p>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-[var(--line-2)] bg-[var(--panel-2)]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Logo da empresa" className="h-full w-full object-contain" />
          ) : (
            <Icon name="briefcase" size={24} className="text-[var(--dim)]" />
          )}
        </div>
        <label className="hx-btn hx-btn-ghost cursor-pointer text-sm">
          {subindo ? "Enviando..." : url ? "Trocar logo" : "Enviar logo"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      </div>
      <p className="mt-2 text-xs text-[var(--dim)]">Aparece na sua área. PNG com fundo transparente fica melhor.</p>
    </div>
  );
}
