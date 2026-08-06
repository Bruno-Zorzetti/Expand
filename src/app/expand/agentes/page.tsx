import { redirect } from "next/navigation";

// Agentes e equipe agora são um time só — tudo vive em /expand/equipe.
export default function Agentes() {
  redirect("/expand/equipe");
}
