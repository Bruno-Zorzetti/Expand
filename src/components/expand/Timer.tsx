"use client";

import { useEffect, useState } from "react";

export default function Timer({ start }: { start: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(i); }, []);
  const min = Math.max(0, Math.floor((now - new Date(start).getTime()) / 60000));
  const txt = min < 60 ? `${min}min` : min < 1440 ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}` : `${Math.floor(min / 1440)}d ${Math.floor((min % 1440) / 60)}h`;
  return <span title="Tempo desde que entrou em execução" style={{ color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>⏱ {txt}</span>;
}
