import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Mesma composição do <LogoMark> em src/components/Logo.tsx (3 barras
// ascendentes) — repetida aqui porque o ImageResponse (Satori) não corre no
// browser nem entende var(), por isso a cor vem em hex fixo (--series-1).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 3,
          padding: 5,
          background: "#2a78d6",
          borderRadius: 8,
        }}
      >
        <div style={{ width: 5, height: 10, borderRadius: 2, background: "white" }} />
        <div style={{ width: 5, height: 16, borderRadius: 2, background: "white" }} />
        <div style={{ width: 5, height: 22, borderRadius: 2, background: "white" }} />
      </div>
    ),
    { ...size }
  );
}
