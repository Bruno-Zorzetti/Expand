import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // entregas da equipe (planilhas/imagens) via server action
    serverActions: { bodySizeLimit: "15mb" },
  },
  // Apresentações (open-slide, estático em public/apresentacoes): assets reais são
  // servidos direto; qualquer rota interna da SPA cai no index.html (afterFiles).
  async rewrites() {
    return {
      afterFiles: [
        { source: "/apresentacoes", destination: "/apresentacoes/index.html" },
        { source: "/apresentacoes/:path*", destination: "/apresentacoes/index.html" },
      ],
      beforeFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
