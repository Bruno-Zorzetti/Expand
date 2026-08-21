import { createAdminClient } from "@/lib/supabase/admin";

// ── Auth ──────────────────────────────────────────────────────────────────────

async function lerConfig(key: string): Promise<string> {
  const env = process.env[key];
  if (env) return env;
  const sb = createAdminClient();
  if (!sb) return "";
  const { data } = await sb.from("system_config").select("value").eq("key", key).single();
  return (data?.value as string) ?? "";
}

async function salvarConfig(key: string, value: string) {
  const sb = createAdminClient();
  if (!sb) return;
  await sb.from("system_config").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

/** Obtém um access token válido, renovando via refresh_token se necessário. */
export async function getGoogleToken(): Promise<string | null> {
  const [token, refresh, clientId, clientSecret] = await Promise.all([
    lerConfig("GOOGLE_ACCESS_TOKEN"),
    lerConfig("GOOGLE_REFRESH_TOKEN"),
    lerConfig("GOOGLE_CLIENT_ID"),
    lerConfig("GOOGLE_CLIENT_SECRET"),
  ]);
  if (!token && !refresh) return null;

  // Testar se o token atual ainda funciona
  if (token) {
    const test = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (test.ok) return token;
  }

  // Renovar via refresh_token
  if (!refresh || !clientId || !clientSecret) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refresh, client_id: clientId, client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const j = await res.json() as { access_token?: string; error?: string };
  if (!j.access_token) return null;
  await salvarConfig("GOOGLE_ACCESS_TOKEN", j.access_token);
  return j.access_token;
}

// ── Drive API helpers ─────────────────────────────────────────────────────────

type DriveFile = { id: string; name: string; webViewLink: string; mimeType: string };

/** Cria uma pasta no Google Drive. Retorna o ID e link. */
export async function criarPasta(
  nome: string,
  parentId?: string | null,
  token?: string | null,
): Promise<DriveFile | null> {
  const t = token ?? await getGoogleToken();
  if (!t) return null;

  const meta: Record<string, unknown> = {
    name: nome,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) meta.parents = [parentId];

  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink,mimeType",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify(meta),
    },
  );
  if (!res.ok) return null;
  return await res.json() as DriveFile;
}

/** Copia um arquivo do Drive para uma pasta de destino. */
export async function copiarArquivo(
  fileId: string,
  nome: string,
  parentId: string,
  token?: string | null,
): Promise<DriveFile | null> {
  const t = token ?? await getGoogleToken();
  if (!t) return null;

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/copy?fields=id,name,webViewLink`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: nome, parents: [parentId] }),
    },
  );
  if (!res.ok) return null;
  return await res.json() as DriveFile;
}

/** Faz upload de um arquivo (buffer) para uma pasta do Drive. */
export async function uploadArquivo(
  nome: string,
  buffer: Buffer,
  mimeType: string,
  parentId?: string | null,
  token?: string | null,
): Promise<DriveFile | null> {
  const t = token ?? await getGoogleToken();
  if (!t) return null;

  const meta: Record<string, unknown> = { name: nome, mimeType };
  if (parentId) meta.parents = [parentId];

  // Upload multipart
  const boundary = "expand_boundary_" + Date.now();
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(body.byteLength),
      },
      body,
    },
  );
  if (!res.ok) return null;
  return await res.json() as DriveFile;
}

/** Define permissão pública de leitura num arquivo ou pasta. */
export async function tornarPublico(fileId: string, token?: string | null): Promise<boolean> {
  const t = token ?? await getGoogleToken();
  if (!t) return false;
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  return res.ok;
}

// ── Estrutura padrão de cliente ───────────────────────────────────────────────

export type EstruturaPasta = {
  rootId: string;
  rootLink: string;
  pastas: Record<string, { id: string; link: string }>;
};

const SUBPASTAS_ENTREGAVEIS = ["Copy", "Arte", "Vídeo"];

/** Cria a estrutura de pastas padrão para um novo cliente. */
export async function criarEstruturaCliente(
  nomeCliente: string,
  docsModelo: { nome: string; categoria: string; drive_file_id: string | null }[],
  token?: string | null,
): Promise<EstruturaPasta | null> {
  const t = token ?? await getGoogleToken();
  if (!t) return null;

  // Pasta raiz
  const root = await criarPasta(`${nomeCliente} — Expand`, null, t);
  if (!root) return null;

  const pastas: Record<string, { id: string; link: string }> = {};

  // Subpastas principais
  const ESTRUTURA = [
    { key: "documentos",    nome: "01 Documentos" },
    { key: "planilhas",     nome: "02 Planilhas" },
    { key: "apresentacoes", nome: "03 Apresentações" },
    { key: "entregaveis",   nome: "04 Entregáveis" },
    { key: "recebidos",     nome: "05 Recebidos" },
  ];

  // Criar as 5 pastas principais em paralelo
  const criadas = await Promise.all(
    ESTRUTURA.map(s => criarPasta(s.nome, root.id, t).then(p => ({ key: s.key, pasta: p }))),
  );
  for (const { key, pasta } of criadas) {
    if (pasta) pastas[key] = { id: pasta.id, link: pasta.webViewLink };
  }

  // Subpastas dentro de Entregáveis
  if (pastas["entregaveis"]) {
    await Promise.all(SUBPASTAS_ENTREGAVEIS.map(n => criarPasta(n, pastas["entregaveis"].id, t)));
  }

  // Copiar documentos-modelo nas pastas corretas
  const mapaCategoria: Record<string, string> = {
    contrato: "documentos", distrato: "documentos",
    planilha: "planilhas", apresentacao: "apresentacoes",
  };
  await Promise.all(
    docsModelo
      .filter(d => d.drive_file_id)
      .map(async d => {
        const pastaKey = mapaCategoria[d.categoria] ?? "documentos";
        const pastaId = pastas[pastaKey]?.id;
        if (!pastaId) return;
        await copiarArquivo(d.drive_file_id!, d.nome, pastaId, t);
      }),
  );

  return { rootId: root.id, rootLink: root.webViewLink, pastas };
}
