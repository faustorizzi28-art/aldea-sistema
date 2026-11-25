import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// INTRO de 3,5 s: "Aldea de Valle · Escuela de Verano 2026–27". Sirve en horizontal (1920x1080) y vertical (1080x1920).
// Identidad de Aldea (Instrument Serif + Archivo, cargadas en Espacios.tsx).
const SERIF = "'Instrument Serif', serif";
const SANS = "'Archivo', sans-serif";
const VERDE = "#1E3226";
const AMARILLO = "#F2CA11";
const CREMA = "#F4EFE3";

export const IntroVerano: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const vertical = height > width;
  const k = vertical ? 1 : 0.9;
  const s = (d: number) => spring({ frame: frame - d, fps, config: { damping: 16, stiffness: 120 } });
  const sol = s(0);
  const logo = s(6);
  const t1 = s(14);
  const t2 = s(20);
  const linea = interpolate(frame, [26, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const salida = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  const brillo = interpolate(frame, [0, durationInFrames], [0.92, 1.08]);
  return (
    <AbsoluteFill style={{ backgroundColor: VERDE, opacity: salida, overflow: "hidden" }}>
      {/* sol amarillo que se expande desde el centro */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: Math.max(width, height) * 1.4,
            height: Math.max(width, height) * 1.4,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(242,202,17,0.32) 0%, rgba(242,202,17,0.08) 35%, rgba(30,50,38,0) 62%)`,
            transform: `scale(${sol * brillo})`,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 22 * k }}>
        <Img
          src={staticFile("fotos/logo-aldea.png")}
          style={{ height: (vertical ? 300 : 230) * k, opacity: logo, transform: `translateY(${(1 - logo) * 40}px) scale(${0.8 + 0.2 * logo})` }}
        />
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: (vertical ? 36 : 30) * k, letterSpacing: "0.4em", color: AMARILLO, opacity: t1, transform: `translateY(${(1 - t1) * 20}px)`, marginTop: 10 }}>
          ALDEA DE VALLE
        </div>
        <div style={{ fontFamily: SERIF, fontSize: (vertical ? 150 : 140) * k, lineHeight: 0.95, color: CREMA, textAlign: "center", opacity: t2, transform: `translateY(${(1 - t2) * 30}px)` }}>
          Escuela <i style={{ color: AMARILLO }}>de Verano</i>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24, opacity: linea }}>
          <div style={{ width: 120 * linea, height: 3, backgroundColor: AMARILLO }} />
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: (vertical ? 50 : 44) * k, letterSpacing: "0.2em", color: CREMA }}>2026–27</div>
          <div style={{ width: 120 * linea, height: 3, backgroundColor: AMARILLO }} />
        </div>
      </AbsoluteFill>
      <Audio src={staticFile("sonidos/whoosh.mp3")} volume={0.6} />
      <Audio src={staticFile("sonidos/riser.mp3")} volume={(f) => interpolate(f, [0, 30, 60], [0.25, 0.4, 0])} />
    </AbsoluteFill>
  );
};
