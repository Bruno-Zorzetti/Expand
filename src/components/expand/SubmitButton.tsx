"use client";

import { useFormStatus } from "react-dom";

interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  loadingText?: string;
  variant?: "primary" | "ghost" | "danger" | "arq";
  disabled?: boolean;
}

export function SubmitButton({ children, className, style, loadingText, variant = "primary", disabled }: Props) {
  const { pending } = useFormStatus();
  const busy = pending || disabled;

  const base =
    variant === "arq" ? "ex-arqbtn" :
    variant === "ghost" ? "hx-btn hx-btn-ghost" :
    variant === "danger" ? "hx-btn hx-btn-danger" :
    "hx-btn hx-btn-primary";

  return (
    <button
      type="submit"
      disabled={busy}
      aria-busy={pending ? "true" : undefined}
      className={`${base}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {pending && loadingText ? loadingText : children}
    </button>
  );
}
