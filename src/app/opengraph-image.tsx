import { ImageResponse } from "next/og";
export const alt =
  "Sprint by Scalezix — Every great sale starts with a conversation.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "65px 80px",
        background: "linear-gradient(125deg,#f7faff,#eaf1ff)",
        color: "#183258",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 42,
          fontWeight: 700,
          letterSpacing: -2,
        }}
      >
        sprint<span style={{ color: "#3975ee" }}>.</span>
        <span
          style={{
            fontSize: 12,
            letterSpacing: 3,
            color: "#8097bc",
            marginLeft: 20,
          }}
        >
          BY SCALEZIX
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: -3,
          lineHeight: 1.1,
          marginTop: 70,
        }}
      >
        Your next chapter
        <span style={{ color: "#3674ed", marginTop: 10 }}>
          starts with a hello.
        </span>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 23,
          color: "#7a91b5",
          marginTop: 35,
        }}
      >
        WhatsApp, email, and AI calling. One connected workspace.
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "auto",
          fontSize: 13,
          color: "#9baecc",
          letterSpacing: 2,
        }}
      >
        PRODUCT IN DEVELOPMENT · EXPLORE THE PREVIEW
      </div>
    </div>,
    size,
  );
}
