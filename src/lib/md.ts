// Mini-renderer de Markdown → HTML, sem dependências. Escapa HTML antes de aplicar
// as transformações (o conteúdo é da própria operação, mas escapamos por segurança).
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function inline(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

export function renderMarkdown(md: string): string {
  const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  let para: string[] = [];

  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); closeList(); continue; }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { flushPara(); closeList(); const n = h[1].length + 1; out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue; }

    if (/^>\s?/.test(line)) { flushPara(); closeList(); out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`); continue; }

    if (/^([-*+])\s+/.test(line)) { flushPara(); if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; } out.push(`<li>${inline(line.replace(/^([-*+])\s+/, ""))}</li>`); continue; }
    const ol = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (ol) { flushPara(); if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; } out.push(`<li>${inline(ol[2])}</li>`); continue; }

    if (/^([-*_])\1{2,}$/.test(line)) { flushPara(); closeList(); out.push("<hr/>"); continue; }

    para.push(line);
  }
  flushPara(); closeList();
  return out.join("\n");
}
