import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Expand — Motor de Trabalho";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #071610 0%, #0A2117 40%, #0F2D1E 70%, #071610 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow top-right */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 600,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(ellipse at 80% 20%, rgba(70,160,100,0.12) 0%, transparent 65%)",
          }}
        />
        {/* Glow bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 500,
            height: 350,
            borderRadius: "50%",
            background: "radial-gradient(ellipse at 20% 85%, rgba(30,90,55,0.14) 0%, transparent 65%)",
          }}
        />

        {/* Grid lines decoration */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(29,64,52,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(29,64,52,0.25) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Logo mark — stylized E */}
          <svg width="80" height="80" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0A2117" />
                <stop offset="100%" stopColor="#071610" />
              </linearGradient>
              <linearGradient id="g2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#E0BC85" />
                <stop offset="100%" stopColor="#C89B5E" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="7" fill="url(#bg2)" />
            <rect x="9" y="8" width="14" height="2.5" rx="1.25" fill="url(#g2)" />
            <rect x="9" y="14.75" width="11" height="2.5" rx="1.25" fill="url(#g2)" />
            <rect x="9" y="21.5" width="14" height="2.5" rx="1.25" fill="url(#g2)" />
            <rect x="9" y="8" width="2.5" height="16" rx="1.25" fill="url(#g2)" />
          </svg>

          {/* Brand name */}
          <div
            style={{
              fontFamily: "serif",
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: "#C89B5E",
              marginTop: 24,
              lineHeight: 1,
              textShadow: "0 0 80px rgba(200,155,94,0.35)",
            }}
          >
            EXPAND
          </div>

          {/* Divider */}
          <div
            style={{
              width: 60,
              height: 1,
              background: "linear-gradient(90deg, transparent, rgba(200,155,94,0.5), transparent)",
              marginTop: 28,
            }}
          />

          {/* Tagline */}
          <div
            style={{
              marginTop: 24,
              fontSize: 22,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "rgba(200,168,78,0.5)",
              fontFamily: "sans-serif",
            }}
          >
            Motor de Trabalho
          </div>

          {/* Description */}
          <div
            style={{
              marginTop: 20,
              fontSize: 18,
              color: "rgba(180,220,200,0.4)",
              fontFamily: "sans-serif",
              textAlign: "center",
              maxWidth: 580,
              lineHeight: 1.6,
              letterSpacing: "0.03em",
            }}
          >
            Tarefas · Pipeline · Portal do Cliente · Agentes de IA
          </div>
        </div>

        {/* Bottom badge */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 60,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 20,
            border: "1px solid rgba(200,155,94,0.2)",
            background: "rgba(10,33,23,0.8)",
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6FBF92" }} />
          <span
            style={{
              fontSize: 13,
              color: "rgba(200,155,94,0.7)",
              fontFamily: "sans-serif",
              letterSpacing: "0.08em",
            }}
          >
            expand.hshs.com.br
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
