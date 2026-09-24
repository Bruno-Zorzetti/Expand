/**
 * Cliente da API Ingaia Partners
 * Docs: https://partners.ingaia.com.br/docs
 *
 * Env vars necessárias:
 *   INGAIA_PRIVATE_KEY      — Chave privada (painel Kenlo → Integrações → API)
 *   INGAIA_USER_INTEGRATION — Usuário de integração
 */

const BASE = "https://partners.ingaia.com.br";

// ── Tipos ────────────────────────────────────────────────────────────────────
export type IngaiaFoto = {
  nomeArquivo: string;
  fotoTitulo: string;
  fotoDescricao: string;
  fotoTipo: string;
  urlArquivo: string;
  principal: boolean;
};

export type IngaiaImovel = {
  idImovel: number;
  codigoImovel: string;
  codigoImovelAuxiliar: string;
  dataCadastro: string;
  dataAtualizacaoImovel: string;
  tituloImovel: string;
  statusImovel: string;
  tipoImovel: string;
  subTipoImovel: string;
  finalidade: string;    // "Venda" | "Locação" | "Venda e Locação"
  categoriaImovel: string;
  pais: string;
  estado: string;
  cidade: string;
  bairro: string;
  endereco: string;
  numero: number;
  cep: number;
  complementoEndereco: string;
  latitude: number;
  longitude: number;
  nomeCondominio: string;
  precoVenda: number;
  precoLocacao: number;
  precoCondominio: number;
  precoIptu: number;
  areaUtil: number;
  areaTotal: number;
  areaPrivativa: number;
  qtdDormitorios: number;
  qtdSuites: number;
  qtdBanheiros: number;
  qtdSalas: number;
  qtdVagas: number;
  qtdVagasCobertas: number;
  qtdVagasDescobertas: number;
  observacao: string;
  // amenidades
  piscina: boolean;
  churrasqueira: boolean;
  sauna: boolean;
  varanda: boolean;
  varandaGourmet: boolean;
  mobiliado: boolean;
  arCondicionado: boolean;
  elevador: boolean;
  academia: boolean;
  portaria: boolean;
  // mídia
  linkVideo: string;
  linkTour: string;
  fotos: IngaiaFoto[];
};

export type IngaiaListPage = {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
  imoveis: IngaiaImovel[];
};

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function ingaiaAuth(): Promise<string> {
  const privateKey      = process.env.INGAIA_PRIVATE_KEY || "";
  const userIntegration = process.env.INGAIA_USER_INTEGRATION || "";

  if (!privateKey || !userIntegration) {
    throw new Error("INGAIA_PRIVATE_KEY e INGAIA_USER_INTEGRATION não configurados.");
  }

  const res = await fetch(`${BASE}/Auth`, {
    method: "POST",
    headers: {
      private_key:      privateKey,
      user_integration: userIntegration,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Ingaia Auth falhou: HTTP ${res.status}`);
  }

  // A API retorna o token no body; tentamos vários formatos comuns
  const body = await res.json().catch(() => ({}));
  const token =
    body?.token        ||
    body?.Token        ||
    body?.access_token ||
    body?.accessToken  ||
    body?.jwt          ||
    (typeof body === "string" ? body : "");

  if (!token) {
    throw new Error("Token não encontrado na resposta do Ingaia Auth.");
  }

  return token as string;
}

// ── Busca imóveis (paginada) ─────────────────────────────────────────────────
export async function fetchImoveisPage(
  token: string,
  pagina = 1,
  quantidade = 500,
  status = "Ativo"
): Promise<IngaiaListPage> {
  const url = new URL(`${BASE}/integration/Imob`);
  url.searchParams.set("Quantidade", String(quantidade));
  url.searchParams.set("Pagina", String(pagina));
  url.searchParams.append("Status", status);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Ingaia /integration/Imob falhou: HTTP ${res.status}`);
  }

  return res.json() as Promise<IngaiaListPage>;
}

// ── Busca TODOS os imóveis ativos (paginação automática) ─────────────────────
export async function fetchTodosImoveis(token: string): Promise<IngaiaImovel[]> {
  const firstPage = await fetchImoveisPage(token, 1);
  const all: IngaiaImovel[] = [...firstPage.imoveis];

  const totalPages = firstPage.totalPaginas;
  const restPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

  // Busca as demais páginas em paralelo (max 5 por vez para não sobrecarregar)
  const CHUNK = 5;
  for (let i = 0; i < restPages.length; i += CHUNK) {
    const chunk = restPages.slice(i, i + CHUNK);
    const pages = await Promise.all(chunk.map((p) => fetchImoveisPage(token, p)));
    pages.forEach((page) => all.push(...page.imoveis));
  }

  return all;
}

// ── Converte Ingaia JSON → GrupZap XML ────────────────────────────────────────
function escXml(s: string | number | undefined | null): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mapFinalidade(f: string): "For Sale" | "For Rent" | string {
  const l = (f || "").toLowerCase();
  if (l.includes("venda") && l.includes("loca")) return "For Sale"; // venda e locação → prioridade venda
  if (l.includes("venda")) return "For Sale";
  if (l.includes("loca") || l.includes("aluguel")) return "For Rent";
  return "For Sale";
}

function mapTipo(tipo: string, sub: string): { propertyType: string; subPropertyType: string } {
  const t = (tipo || "").toLowerCase();
  const s = (sub  || "").toLowerCase();
  if (t.includes("terreno") || t.includes("lote"))            return { propertyType: "Land",        subPropertyType: "Land" };
  if (t.includes("comercial") || t.includes("sala"))          return { propertyType: "Commercial",   subPropertyType: s || "Commercial" };
  if (t.includes("apart") || s.includes("apart"))             return { propertyType: "Residential",  subPropertyType: "Apartment" };
  if (t.includes("casa") || s.includes("casa"))               return { propertyType: "Residential",  subPropertyType: "House" };
  if (t.includes("kitnet") || t.includes("studio"))           return { propertyType: "Residential",  subPropertyType: "Studio" };
  if (t.includes("sobrado") || t.includes("duplex"))          return { propertyType: "Residential",  subPropertyType: "Home" };
  if (t.includes("condominio") || t.includes("rural"))        return { propertyType: "Residential",  subPropertyType: "Home" };
  return { propertyType: "Residential", subPropertyType: sub || tipo || "Residential" };
}

export function imoveisToGrupZapXml(imoveis: IngaiaImovel[]): string {
  const listings = imoveis.map((im) => {
    const transaction = mapFinalidade(im.finalidade);
    const { propertyType, subPropertyType } = mapTipo(im.tipoImovel, im.subTipoImovel);
    const price = transaction === "For Sale" ? im.precoVenda : im.precoLocacao;
    const priceTag = transaction === "For Sale"
      ? `<ListPrice>${price > 0 ? price : ""}</ListPrice>`
      : `<RentPrice>${price > 0 ? price : ""}</RentPrice>`;

    const cep = im.cep ? String(im.cep).padStart(8, "0") : "";

    const pictures = (im.fotos || [])
      .filter((f) => f.urlArquivo)
      .map((f, i) => `
          <Picture>
            <PictureID>${i + 1}</PictureID>
            <FullPath>${escXml(f.urlArquivo)}</FullPath>
          </Picture>`)
      .join("");

    return `
  <Listing>
    <ListingID>${escXml(im.codigoImovel || im.idImovel)}</ListingID>
    <Title>${escXml(im.tituloImovel)}</Title>
    <TransactionType>${transaction}</TransactionType>
    <PropertyType>${propertyType}</PropertyType>
    <SubPropertyType>${escXml(subPropertyType)}</SubPropertyType>
    ${priceTag}
    <Details>
      <NumberOfBedrooms>${im.qtdDormitorios || 0}</NumberOfBedrooms>
      <NumberOfSuites>${im.qtdSuites || 0}</NumberOfSuites>
      <NumberOfBathrooms>${im.qtdBanheiros || 0}</NumberOfBathrooms>
      <NumberOfRooms>${im.qtdSalas || 0}</NumberOfRooms>
      <Garages>${(im.qtdVagas || 0) || (im.qtdVagasCobertas || 0) + (im.qtdVagasDescobertas || 0)}</Garages>
      <TotalArea>${im.areaTotal || ""}</TotalArea>
      <UsableArea>${im.areaUtil || ""}</UsableArea>
    </Details>
    <Location>
      <Country>${escXml(im.pais || "Brasil")}</Country>
      <State>${escXml(im.estado)}</State>
      <City>${escXml(im.cidade)}</City>
      <Neighborhood>${escXml(im.bairro)}</Neighborhood>
      <Address>${escXml(im.endereco)}</Address>
      <Complement>${escXml(im.complementoEndereco)}</Complement>
      <ZipCode>${cep}</ZipCode>
      <Latitude>${im.latitude || ""}</Latitude>
      <Longitude>${im.longitude || ""}</Longitude>
    </Location>
    <Pictures>${pictures}
    </Pictures>
    <Description><![CDATA[${im.observacao || ""}]]></Description>
    <CondominiumFee>${im.precoCondominio || ""}</CondominiumFee>
    <YearlyTax>${im.precoIptu || ""}</YearlyTax>
    ${im.linkVideo ? `<VideoLink>${escXml(im.linkVideo)}</VideoLink>` : ""}
    ${im.linkTour  ? `<TourLink>${escXml(im.linkTour)}</TourLink>` : ""}
  </Listing>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<Listings>${listings.join("")}
</Listings>`;
}
