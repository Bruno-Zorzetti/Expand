import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join, resolve } from "path";
import os from "os";

const KG_BASE = join(os.homedir(), ".claude", "knowledge-graph");

type Section = { heading: string; body: string; level: number };

function parseMarkdownSections(md: string): Section[] {
  const sections: Section[] = [];
  let cur: { heading: string; level: number; lines: string[] } | null = null;

  for (const line of md.split("\n")) {
    const hm = line.match(/^(#{1,4})\s+(.+)/);
    if (hm) {
      if (cur && cur.lines.some((l) => l.trim())) {
        sections.push({ heading: cur.heading, level: cur.level, body: cur.lines.join("\n").trim() });
      }
      cur = { heading: hm[2].trim(), level: hm[1].length, lines: [] };
    } else if (cur) {
      cur.lines.push(line);
    } else if (line.trim()) {
      cur = { heading: "Introdução", level: 1, lines: [line] };
    }
  }
  if (cur && cur.lines.some((l) => l.trim())) {
    sections.push({ heading: cur.heading, level: cur.level, body: cur.lines.join("\n").trim() });
  }
  return sections;
}

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") ?? "";
  if (!path) return NextResponse.json({ error: "no path" }, { status: 400 });

  // Security: ensure path stays within KG_BASE
  const full = resolve(join(KG_BASE, path));
  const sep = full.startsWith(KG_BASE + "\\") || full.startsWith(KG_BASE + "/");
  if (!sep) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    const raw = readFileSync(full, "utf-8");
    const sections = parseMarkdownSections(raw);
    return NextResponse.json({ raw: raw.slice(0, 12000), sections });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
