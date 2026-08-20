"use client";
import { useState, useEffect } from "react";

export default function SoundCloudPlayer({ url }: { url: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("sc_player_open") === "1") setOpen(true);
    } catch { /* noop */ }
  }, []);

  if (!url) return null;

  function toggle() {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem("sc_player_open", next ? "1" : "0"); } catch { /* noop */ }
  }

  const embedUrl =
    `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}` +
    `&color=%23D4A02A&auto_play=false&buying=false&liking=false` +
    `&download=false&sharing=false&show_artwork=true&show_comments=false` +
    `&show_playcount=false&show_user=false&hide_related=true`;

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 999,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
      pointerEvents: "none",
    }}>
      {open && (
        <div style={{
          borderRadius: 14, overflow: "hidden", pointerEvents: "all",
          boxShadow: "0 8px 40px rgba(0,0,0,.5)",
          border: "1px solid var(--line-2)",
        }}>
          <iframe
            src={embedUrl}
            width="300"
            height="166"
            allow="autoplay"
            style={{ display: "block", border: "none" }}
            title="SoundCloud player"
          />
        </div>
      )}
      <button
        onClick={toggle}
        title={open ? "Fechar player" : "Música ambiente"}
        style={{
          pointerEvents: "all",
          width: 40, height: 40, borderRadius: "50%",
          background: open ? "var(--accent)" : "color-mix(in srgb, var(--accent) 20%, var(--panel))",
          color: open ? "var(--bg)" : "var(--accent)",
          border: `1px solid ${open ? "transparent" : "color-mix(in srgb, var(--accent) 40%, transparent)"}`,
          cursor: "pointer", fontSize: 18, lineHeight: 1,
          boxShadow: open ? "0 4px 16px rgba(0,0,0,.4)" : "0 2px 8px rgba(0,0,0,.2)",
          transition: "all .2s",
        }}
        aria-label={open ? "Fechar player" : "Abrir player de música"}
      >
        ♪
      </button>
    </div>
  );
}
