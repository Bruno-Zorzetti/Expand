import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json([]);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_expand", { q });

  if (error) return NextResponse.json([]);

  return NextResponse.json(data ?? []);
}
