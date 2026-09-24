import { redirect } from "next/navigation";

// Alias público — redireciona para a ferramenta com auth
export default function VmaRedirect() {
  redirect("/expand/vma");
}
