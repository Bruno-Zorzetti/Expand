/**
 * GET /api/vma/feed
 * Serve imóveis ativos do banco como GrupZap XML (para OLX e outros portais).
 * Cache de 1 hora no CDN. ?bust=1 força refresh.
 */
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Foto = { url: string; principal: boolean; nome: string };
type Imovel = {
  id: string;
  codigo: string | null;
  titulo: string;
  finalidade: string;
  tipo: string;
  subtipo: string;
  pais: string;
  estado: string;
  cidade: string;
  bairro: string;
  endereco: string;
  numero: string;
  complemento: string;
  cep: string;
  latitude: number | null;
  longitude: number | null;
  preco_venda: number;
  preco_locacao: number;
  preco_condominio: number;
  preco_iptu: number;
  area_total: number;
  area_util: number;
  quartos: number;
  suites: number;
  banheiros: number;
  vagas: number;
  salas: number;
  descricao: string;
  link_video: string;
  link_tour: string;
  fotos: Foto[];
};

function esc(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toXml(imoveis: Imovel[]): string {
  const listings = imoveis.map((im) => {
    const tx = (im.finalidade || "").toLowerCase().includes("loca") ? "For Rent" : "For Sale";
    const price = tx === "For Sale" ? im.preco_venda : im.preco_locacao;
    const priceTag = tx === "For Sale"
      ? `<ListPrice>${price > 0 ? price : ""}</ListPrice>`
      : `<RentPrice>${price > 0 ? price : ""}</RentPrice>`;

    const pictures = (im.fotos || [])
      .filter(f => f.url)
      .map((f, i) => `<Picture><PictureID>${i + 1}</PictureID><FullPath>${esc(f.url)}</FullPath></Picture>`)
      .join("");

    return `
  <Listing>
    <ListingID>${esc(im.codigo || im.id)}</ListingID>
    <Title>${esc(im.titulo)}</Title>
    <TransactionType>${tx}</TransactionType>
    <PropertyType>${esc(im.tipo) || "Residential"}</PropertyType>
    <SubPropertyType>${esc(im.subtipo)}</SubPropertyType>
    ${priceTag}
    <Details>
      <NumberOfBedrooms>${im.quartos || 0}</NumberOfBedrooms>
      <NumberOfSuites>${im.suites || 0}</NumberOfSuites>
      <NumberOfBathrooms>${im.banheiros || 0}</NumberOfBathrooms>
      <NumberOfRooms>${im.salas || 0}</NumberOfRooms>
      <Garages>${im.vagas || 0}</Garages>
      <TotalArea>${im.area_total || ""}</TotalArea>
      <UsableArea>${im.area_util || ""}</UsableArea>
    </Details>
    <Location>
      <Country>${esc(im.pais || "Brasil")}</Country>
      <State>${esc(im.estado)}</State>
      <City>${esc(im.cidade)}</City>
      <Neighborhood>${esc(im.bairro)}</Neighborhood>
      <Address>${esc(im.endereco)}</Address>
      <Complement>${esc(im.complemento)}</Complement>
      <ZipCode>${esc(im.cep)}</ZipCode>
      <Latitude>${im.latitude || ""}</Latitude>
      <Longitude>${im.longitude || ""}</Longitude>
    </Location>
    <Pictures>${pictures}</Pictures>
    <Description><![CDATA[${im.descricao || ""}]]></Description>
    <CondominiumFee>${im.preco_condominio || ""}</CondominiumFee>
    <YearlyTax>${im.preco_iptu || ""}</YearlyTax>
    ${im.link_video ? `<VideoLink>${esc(im.link_video)}</VideoLink>` : ""}
    ${im.link_tour  ? `<TourLink>${esc(im.link_tour)}</TourLink>` : ""}
  </Listing>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<Listings>${listings.join("")}\n</Listings>`;
}

export async function GET(req: Request) {
  const bust = new URL(req.url).searchParams.get("bust") === "1";

  // Usa anon key — policy "vma_public_read_ativos" libera leitura pública de imóveis ativos
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from("vma_imoveis")
    .select("*")
    .eq("status", "Ativo")
    .order("criado_em", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const xml = toXml((data ?? []) as unknown as Imovel[]);

  return new Response(xml, {
    headers: {
      "Content-Type":  "application/xml; charset=utf-8",
      "Cache-Control": bust
        ? "no-store"
        : "public, s-maxage=3600, stale-while-revalidate=7200",
      "X-Listing-Count": String((data ?? []).length),
    },
  });
}
