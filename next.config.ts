import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // entregas da equipe (planilhas/imagens) via server action
    serverActions: { bodySizeLimit: "15mb" },
  },
};

export default nextConfig;
