import { ImageResponse } from "@vercel/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "Layover Legends";
  const subtitle = searchParams.get("subtitle") || "Curated Amsterdam layovers";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F172A",
          padding: "80px",
          gap: "24px",
        }}
      >
        {/* Orange accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            background: "#F97316",
          }}
        />

        {/* Site name */}
        <div
          style={{
            fontSize: "22px",
            fontWeight: 600,
            color: "#F97316",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Layover Legends
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 50 ? "44px" : "56px",
            fontWeight: 700,
            color: "#FFF7ED",
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: "900px",
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "26px",
            color: "#FFF7ED",
            opacity: 0.55,
            textAlign: "center",
            maxWidth: "700px",
          }}
        >
          {subtitle}
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            fontSize: "18px",
            color: "#FFF7ED",
            opacity: 0.3,
          }}
        >
          layover-legends.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
