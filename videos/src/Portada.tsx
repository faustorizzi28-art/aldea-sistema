import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
const MONT = "'Montserrat', sans-serif";
// Portada de reel 1080x1920 (zona segura 4:5 al centro) para el teaser de Colonia Dewey.
type P = { foto: string; logo: string; arriba: string; abajo: string; logoAncho?: number };
export const Portada: React.FC<P> = (p) => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    <Img src={staticFile(`fotos/${p.foto}`)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.8) contrast(1.15) brightness(0.85)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.75) 100%)" }} />
    <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 100%)" }} />
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 330 }}>
      <div style={{ fontFamily: MONT, fontWeight: 800, fontSize: 46, letterSpacing: "0.35em", color: "#FFE9C7" }}>{p.arriba}</div>
    </AbsoluteFill>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 470, gap: 26 }}>
      <Img src={staticFile(`fotos/${p.logo}`)} style={{ width: p.logoAncho ?? 860, height: "auto", filter: "drop-shadow(0 16px 40px rgba(0,0,0,0.6))" }} />
      <div style={{ fontFamily: MONT, fontWeight: 900, fontSize: 64, letterSpacing: "0.2em", color: "white", whiteSpace: "pre-line", textAlign: "center", lineHeight: 1.25 }}>{p.abajo}</div>
    </AbsoluteFill>
  </AbsoluteFill>
);

export const PortadaDewey: React.FC = () => <Portada foto="dewey-fogon.jpg" logo="logo-colonia-dewey.png" arriba="ALGO ESTÁ POR VOLVER" abajo="PRÓXIMAMENTE" />;
export const PortadaAldeaVerano: React.FC = () => (
  <Portada foto="pileta-verano.jpg" logo="logo-aldea.png" logoAncho={300} arriba="ALDEA DE VALLE" abajo={"ESCUELA DE VERANO\n2026–27\nMUY PRONTO"} />
);

// Portada elegante para los reels de eventos de Aldea (Instrument Serif + Archivo, cargadas en Espacios.tsx).
// El título va dentro de la zona 4:5 del centro para que no se corte en la grilla del perfil.
const SERIF = "'Instrument Serif', serif";
const SANS = "'Archivo', sans-serif";
type PE = { foto: string; arriba: string; titulo: string; abajo: string };
export const PortadaEventos: React.FC<PE> = (p) => (
  <AbsoluteFill style={{ backgroundColor: "#1E3226" }}>
    <Img src={staticFile(`fotos/${p.foto}`)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(1.05) contrast(1.05)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,30,24,0.55) 0%, rgba(20,30,24,0) 22%, rgba(20,30,24,0) 48%, rgba(20,30,24,0.82) 72%, rgba(20,30,24,0.92) 100%)" }} />
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 330 }}>
      <Img src={staticFile("fotos/logo-aldea.png")} style={{ width: 120, height: "auto", filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.5))" }} />
    </AbsoluteFill>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 1130, gap: 22 }}>
      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 32, letterSpacing: "0.34em", color: "#E9D9B4" }}>{p.arriba}</div>
      <div style={{ fontFamily: SERIF, fontSize: 170, lineHeight: 0.95, color: "white", textAlign: "center", whiteSpace: "pre-line", letterSpacing: "-0.01em", textShadow: "0 4px 24px rgba(0,0,0,0.35)" }}>
        {p.titulo}
      </div>
      <div style={{ width: 90, height: 2, backgroundColor: "#E9D9B4", marginTop: 8 }} />
      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 34, letterSpacing: "0.12em", color: "white" }}>{p.abajo}</div>
    </AbsoluteFill>
  </AbsoluteFill>
);
export const PortadaAldeaViernes: React.FC = () => (
  <PortadaEventos foto="aldea-viernes-revelacion.jpg" arriba="ALDEA DE VALLE" titulo={"Un viernes\nen Aldea"} abajo="Revelaciones · Cumpleaños · Encuentros" />
);
