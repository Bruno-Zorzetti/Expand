"use client";
import { useState, useEffect } from "react";

type Playlist = { id: string; name: string; url: string };

function parseEmbed(rawUrl: string): { src: string; isYT: boolean } | null {
  try {
    const u = new URL(rawUrl);
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
      const list = u.searchParams.get("list");
      const v = u.searchParams.get("v") ?? (u.hostname === "youtu.be" ? u.pathname.slice(1) : null);
      if (list) return { src: `https://www.youtube.com/embed/videoseries?list=${list}&autoplay=1`, isYT: true };
      if (v)    return { src: `https://www.youtube.com/embed/${v}?autoplay=1`, isYT: true };
    }
    if (u.hostname.includes("soundcloud.com")) {
      return {
        src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(rawUrl)}&color=%23D4A02A&auto_play=true&buying=false&liking=false&download=false&sharing=false&show_artwork=true&show_comments=false&show_playcount=false&show_user=false`,
        isYT: false,
      };
    }
    return null;
  } catch { return null; }
}

const LS_KEY = "expand_foco_playlists";

export default function FocoPlayer() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playing, setPlaying]   = useState<string | null>(null);
  const [adding, setAdding]     = useState(false);
  const [name, setName]         = useState("");
  const [url, setUrl]           = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setPlaylists(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  function persist(list: Playlist[]) {
    setPlaylists(list);
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* noop */ }
  }

  function add() {
    if (!name.trim() || !url.trim()) return;
    persist([...playlists, { id: crypto.randomUUID(), name: name.trim(), url: url.trim() }]);
    setName(""); setUrl(""); setAdding(false);
  }

  function remove(id: string) {
    persist(playlists.filter(p => p.id !== id));
    if (playing === id) setPlaying(null);
  }

  const currentIdx = playlists.findIndex(p => p.id === playing);
  const current    = currentIdx >= 0 ? playlists[currentIdx] : undefined;
  const embed      = current ? parseEmbed(current.url) : null;

  function nextTrack() {
    if (playlists.length === 0) return;
    const next = playlists[(currentIdx + 1) % playlists.length];
    setPlaying(next.id);
  }

  const fld: React.CSSProperties = {
    background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 7,
    color: "var(--txt)", padding: "5px 9px", fontSize: 12, outline: "none",
    fontFamily: "inherit", width: "100%",
  };

  return (
    <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid var(--line-2)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)" }}>
          Foco · Música
        </div>
        <button
          onClick={() => setAdding(a => !a)}
          style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          {adding ? "Cancelar" : "+ Playlist"}
        </button>
      </div>

      {adding && (
        <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          <input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} style={fld} />
          <input placeholder="URL YouTube ou SoundCloud" value={url} onChange={e => setUrl(e.target.value)} style={fld} />
          <button
            onClick={add}
            style={{ alignSelf: "flex-start", fontSize: 11.5, padding: "5px 14px", borderRadius: 7, border: "none", background: "var(--accent)", color: "#000", cursor: "pointer", fontWeight: 700 }}
          >
            Salvar
          </button>
        </div>
      )}

      {/* Player area */}
      {embed && (
        <div style={{ marginBottom: 10 }}>
          {embed.isYT ? (
            /* YouTube — audio only: iframe hidden visually, "Now Playing" card shown */
            <div style={{ position: "relative" }}>
              {/* Hidden iframe keeps audio playing */}
              <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", pointerEvents: "none" }}>
                <iframe
                  src={embed.src}
                  width="1" height="1"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media"
                  title="audio"
                />
              </div>
              {/* Now Playing card */}
              <div style={{
                borderRadius: 10, border: "1px solid var(--accent)",
                background: "color-mix(in srgb,var(--accent) 8%,transparent)",
                padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>🎵</span>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--accent)", marginBottom: 2 }}>
                    Tocando agora
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {current?.name}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => setPlaying(null)}
                    title="Pausar"
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--accent)", padding: "2px 4px", lineHeight: 1 }}
                  >
                    ⏸
                  </button>
                  {playlists.length > 1 && (
                    <button
                      onClick={nextTrack}
                      title="Próxima"
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--accent)", padding: "2px 4px", lineHeight: 1 }}
                    >
                      ⏭
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* SoundCloud — show player normally */
            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--line-2)" }}>
              <iframe
                src={embed.src}
                width="100%"
                height={130}
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                title={current?.name ?? "Player"}
                style={{ display: "block" }}
              />
            </div>
          )}
        </div>
      )}

      {playlists.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--mut)", fontStyle: "italic" }}>Sem playlists. Adicione acima.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {playlists.map(p => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 8,
              background: playing === p.id ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "var(--panel-2)",
              border: `1px solid ${playing === p.id ? "var(--accent)" : "var(--line-2)"}`,
            }}>
              <button
                onClick={() => setPlaying(playing === p.id ? null : p.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: playing === p.id ? "var(--accent)" : "var(--dim)", fontSize: 14, padding: 0, flexShrink: 0, lineHeight: 1 }}
              >
                {playing === p.id ? "⏸" : "▶"}
              </button>
              <span style={{ fontSize: 12.5, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--txt)" }}>
                {p.name}
              </span>
              <button
                onClick={() => remove(p.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dim)", fontSize: 11, padding: 0, opacity: 0.5, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
