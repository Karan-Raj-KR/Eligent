import { ImageResponse } from "next/og";

export const alt = "ELIGENT — Know which opportunities you qualify for";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FFF8F0",
          color: "#171525",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#171525",
              color: "#C7F36B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            E
          </div>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>ELIGENT</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              maxWidth: 980,
            }}
          >
            Know which opportunities you qualify for.
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 30, color: "#6B6476" }}>
            Free to check. 99 rupees to get ready to submit.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
