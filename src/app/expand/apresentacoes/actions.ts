"use server";

const TEMPLATES: Record<string, { nome: string; prompt: string }> = {
  "expand-ouro": {
    nome: "Expand Ouro",
    prompt: `Estilo: fundo verde-preto (#08110E), acento dourado (#C89B5E), texto creme (#F4E8D4).
Tipografia: Cinzel (Google Fonts, weight 600-700) para títulos, Inter para corpo.
Regra: cabeçalho com eyebrow + filete dourado fino; rodapé com contador de slide e logo "GRUPO EXPAND".
Sensação: premium, high ticket, clean editorial.`,
  },
  "hashes-azul": {
    nome: "Hashes Azul",
    prompt: `Estilo: fundo escuro (#070a12), acento azul vivo (#2f80ff), texto branco (#f0f4ff).
Tipografia: Inter ou Manrope (Google Fonts), display bold para títulos grandes.
Regra: glassmorphism suave nos cards (branco 6% + blur 12px + borda 1px rgba).
Sensação: tech, moderno, startup, digital.`,
  },
  "moderno-claro": {
    nome: "Moderno Claro",
    prompt: `Estilo: fundo branco (#FFFFFF), acento azul (#0070f3), texto escuro (#0f0f10), cards cinza claro (#f5f5f7).
Tipografia: Inter (Google Fonts), tight tracking nos títulos.
Regra: muito espaço em branco, tipografia grande como elemento visual principal.
Sensação: SaaS, consultoria, corporativo limpo.`,
  },
  "calendario": {
    nome: "Calendário / Linha do Tempo",
    prompt: `Estilo: fundo branco ou escuro com azul (#2f80ff) como acento primário.
Tipografia: Inter limpo.
Regra: INCLUA componentes de calendário HTML quando o conteúdo tiver datas/meses/cronograma. Use uma grade de 7×6 células para meses, linhas do tempo horizontais SVG para cronogramas, barras de Gantt para projetos.
Sensação: planejamento, organização, cronograma visual.`,
  },
};

const BASE_SYSTEM = `Você é um designer de apresentações de classe mundial especializado em HTML/CSS/JS puro.
Gere uma apresentação HTML completamente autossuficiente (sem dependências externas exceto Google Fonts).

REGRAS TÉCNICAS:
- Todo CSS deve estar no <style> no <head>
- Todo JS deve estar em <script> no final do <body>
- Cada slide é uma <section class="slide"> dentro de <div id="deck">
- Navegação: setas do teclado (ArrowLeft/ArrowRight), swipe touch, cliques nas setas visuais
- Atalho F (fullscreen), ESC (sair do fullscreen)
- Indicador de progresso (dots ou barra) visível em todos os slides
- Transições suaves CSS entre slides (slide/fade)
- Cada slide ocupa 100vw × 100vh
- Fontes via @import no CSS (não <link>)
- NUNCA use "vh" ou "vw" dentro de cálculos de fonte — use px ou em
- Retorne SOMENTE o HTML completo começando em <!DOCTYPE html>. Zero explicação.`;

const SLIDE_STRUCTURE = `ESTRUTURA DE SLIDES SUGERIDA (adapte ao conteúdo):
1. Capa (título + subtítulo + autor/empresa)
2. Agenda / Índice (lista dos tópicos)
3-N. Conteúdo (1 ideia por slide — use heading grande + bullets ou visual)
N-1. Destaque / Citação impactante
N. Encerramento (próximos passos ou contato)

ELEMENTOS VISUAIS para usar quando adequado:
- Gráficos de barras em SVG inline
- Gráficos de pizza/donut em SVG
- Cards de KPI (número grande + label)
- Colunas de comparação (antes/depois, A vs B)
- Timeline horizontal
- Calendário mensal (grade 7×5 com dias)
- Bullets com ícones SVG inline
- Citação em aspas tipográficas grandes
- Grid de features (ícone + título + descrição)`;

export async function gerarApresentacao(formData: FormData): Promise<{ html?: string; error?: string }> {
  const conteudo = String(formData.get("conteudo") ?? "").trim();
  const templateKey = String(formData.get("template") ?? "moderno-claro");
  const qtdSlides = Math.min(Math.max(parseInt(String(formData.get("qtd") ?? "8"), 10), 3), 25);
  const idioma = String(formData.get("idioma") ?? "pt");

  if (!conteudo || conteudo.length < 10) return { error: "Por favor insira o conteúdo da apresentação." };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "Chave de API não configurada no servidor." };

  const template = TEMPLATES[templateKey] ?? TEMPLATES["moderno-claro"];
  const idiomaLabel = idioma === "en" ? "English" : "Português do Brasil";

  const userMsg = `TEMPLATE: ${template.nome}
${template.prompt}

${SLIDE_STRUCTURE}

IDIOMA DA APRESENTAÇÃO: ${idiomaLabel}
QUANTIDADE DE SLIDES: ${qtdSlides} slides no total (capa + conteúdo + encerramento)

CONTEÚDO A TRANSFORMAR:
---
${conteudo}
---

Transforme todo o conteúdo acima em ${qtdSlides} slides profissionais e visualmente impactantes.`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 12000,
        system: BASE_SYSTEM,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("Anthropic API error:", err);
      return { error: "Erro ao gerar a apresentação. Tente novamente." };
    }

    const data = await resp.json() as { content: Array<{ type: string; text: string }> };
    const raw = data.content?.[0]?.text ?? "";
    const html = raw.match(/<!DOCTYPE html>[\s\S]*/i)?.[0] ?? raw;
    if (!html.includes("<html")) return { error: "Resposta inválida do modelo. Tente novamente." };
    return { html };
  } catch (e) {
    console.error("Apresentacao generation error:", e);
    return { error: "Erro de conexão. Verifique sua chave de API e tente novamente." };
  }
}

// ── Editor de slides (deck salvo no Supabase) ─────────────────────────────────
import { createClient } from "@/lib/supabase/server";
import { revalidatePath as _rp } from "next/cache";
import type { Slide } from "@/lib/expand-slides";

export async function salvarApresentacao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const slidesRaw = String(formData.get("slides") ?? "[]");
  const publico = formData.get("publico") === "1";
  if (!id) return;
  let slides: Slide[] = [];
  try { slides = JSON.parse(slidesRaw) as Slide[]; } catch { slides = []; }
  const supabase = await createClient();
  await supabase.from("expand_apresentacoes").update({ titulo, slides, publico }).eq("id", id);
  _rp(`/expand/apresentacoes/${id}`);
}
