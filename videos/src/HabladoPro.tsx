import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import { FPS } from "./marca";

// ---------------------------------------------------------------------------
// HABLADO PRO: el estilo de los reels de Aldea / Escuelita (persona hablando a cámara).
//  - subtítulos palabra por palabra, blancos, gruesos, al centro-abajo
//  - "destacados": frase chica arriba + PALABRA ENORME + frase fina en cursiva abajo (+ emoji)
//  - cortes a imágenes de apoyo (b-roll) mientras sigue la voz, con título condensado en cursiva
//  - destellos de luz (light leaks) al entrar y salir de las imágenes de apoyo
//  - zoom "punch-in" alternado en cada frase, música bajita debajo de la voz
// ---------------------------------------------------------------------------

const F = (archivo: string) => staticFile(`fonts/${archivo}`);
loadFont({ family: "Montserrat", url: F("montserrat-latin-800-normal.woff2"), weight: "800" });
loadFont({ family: "Montserrat", url: F("montserrat-latin-900-normal.woff2"), weight: "900" });
loadFont({ family: "Montserrat", url: F("montserrat-latin-900-italic.woff2"), weight: "900", style: "italic" });
loadFont({ family: "Montserrat", url: F("montserrat-latin-500-italic.woff2"), weight: "500", style: "italic" });
loadFont({ family: "Montserrat", url: F("montserrat-latin-300-italic.woff2"), weight: "300", style: "italic" });
loadFont({ family: "Anton", url: F("anton-latin-400-normal.woff2"), weight: "400" });

const MONT = "'Montserrat', sans-serif";
const ANTON = "'Anton', sans-serif";
const SOMBRA = "0 4px 14px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.6)";

export type Palabra = { p: string; i: number; f: number };
export type Frase = { texto: string; inicio: number; fin: number; palabras: Palabra[] };
export type Destacado = { inicio: number; fin: number; arriba?: string; grande: string; abajo?: string; emoji?: string };
export type Apoyo = { inicio: number; fin: number; foto?: string; video?: string; desde?: number; titulo?: string };

export type GuionHabladoPro = {
  titulo: string;
  video: string; // public/clips, vertical 1080x1920, con la voz
  segundos: number;
  frases: Frase[]; // de herramientas/transcribir.py (corregidas a mano)
  destacados?: Destacado[];
  apoyos?: Apoyo[];
  acento?: string; // color de la barrita / detalles
  musica?: string | null;
  volumenMusica?: number;
};

export const duracionHabladoPro = (g: GuionHabladoPro) => Math.round(g.segundos * FPS);

// Zoom alternado: cada frase nueva cambia el encuadre (como el "punch-in" de los editores).
const Persona: React.FC<{ g: GuionHabladoPro }> = ({ g }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  let idx = 0;
  g.frases.forEach((f, k) => {
    if (t >= f.inicio - 0.05) idx = k;
  });
  const escala = idx % 2 === 0 ? 1.0 : 1.14;
  const f0 = Math.round((g.frases[idx]?.inicio ?? 0) * FPS);
  const empuje = interpolate(frame - f0, [0, 4], [1.03, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ transform: `scale(${escala * empuje})`, transformOrigin: "50% 30%" }}>
      <OffthreadVideo src={staticFile(`clips/${g.video}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
};

const ImagenApoyo: React.FC<{ a: Apoyo }> = ({ a }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1.08, 1.18]);
  const s = spring({ frame: frame - 2, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {a.video ? (
        <OffthreadVideo
          src={staticFile(`clips/${a.video}`)}
          startFrom={Math.round((a.desde ?? 0) * FPS)}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }}
        />
      ) : (
        <Img src={staticFile(`fotos/${a.foto}`)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
      )}
      {a.titulo && (
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 560 }}>
          <div
            style={{
              fontFamily: ANTON,
              fontSize: 96,
              letterSpacing: "0.02em",
              color: "white",
              textShadow: SOMBRA,
              transform: `skewX(-10deg) translateY(${(1 - s) * 40}px)`,
              opacity: s,
            }}
          >
            {a.titulo}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// Destello de luz (tipo filtración de lente) que cruza al entrar/salir de una imagen.
const Destello: React.FC = () => {
  const frame = useCurrentFrame();
  const p = frame / 12;
  const op = Math.sin(Math.PI * Math.min(1, p));
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", opacity: op * 0.9, pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(100deg, rgba(0,0,0,0) ${10 + p * 50}%, rgba(255,214,150,0.85) ${22 + p * 50}%, rgba(170,220,255,0.6) ${27 + p * 50}%, rgba(255,150,200,0.45) ${31 + p * 50}%, rgba(0,0,0,0) ${42 + p * 50}%)`,
        }}
      />
    </AbsoluteFill>
  );
};

// Subtítulo palabra por palabra (1–2 palabras a la vez, como en los reels de referencia).
const Subtitulo: React.FC<{ palabras: Palabra[]; ocultar: (t: number) => boolean }> = ({ palabras, ocultar }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (ocultar(t)) return null;
  const k = palabras.findIndex((w) => t >= w.i && t < w.f + 0.12);
  if (k < 0) return null;
  // agrupa de a 2 palabras cortas
  const ini = k % 2 === 0 ? k : k - 1;
  const grupo = palabras.slice(ini, ini + 2).filter((w, j) => j === 0 || w.p.length <= 7);
  const texto = grupo.map((w) => w.p).join(" ");
  const f0 = Math.round(palabras[ini].i * FPS);
  const pop = interpolate(frame - f0, [0, 3, 6], [0.82, 1.06, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 560 }}>
      <div
        style={{
          fontFamily: MONT,
          fontWeight: 800,
          fontSize: 66,
          color: "white",
          textShadow: SOMBRA,
          transform: `scale(${pop})`,
          textAlign: "center",
          maxWidth: 900,
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};

// Destacado: arriba chiquito / PALABRA ENORME en cursiva / abajo fina en cursiva (+ emoji).
const TituloDestacado: React.FC<{ d: Destacado; acento: string }> = ({ d, acento }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = (n: number) => spring({ frame: frame - n, fps, config: { damping: 12, stiffness: 180 } });
  const salida = interpolate(frame, [durationInFrames - 5, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  const letras = d.grande.split("");
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 520, opacity: salida }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", textShadow: SOMBRA }}>
        {d.arriba && (
          <div style={{ fontFamily: MONT, fontWeight: 800, fontSize: 46, color: "white", opacity: s(0), transform: `translateY(${(1 - s(0)) * 20}px)` }}>
            {d.arriba}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: -6 }}>
          {d.emoji && (
            <span style={{ fontSize: 96, transform: `scale(${s(6)}) rotate(${(1 - s(6)) * -40}deg)`, display: "inline-block" }}>{d.emoji}</span>
          )}
          <div
            style={{
              fontFamily: MONT,
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: Math.min(150, Math.floor((d.emoji ? 840 : 960) / (d.grande.length * 0.74))),
              lineHeight: 0.95,
              color: "white",
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {letras.map((c, i) => (
              <span key={i} style={{ display: "inline-block", opacity: s(2 + i * 0.8), transform: `translateY(${(1 - s(2 + i * 0.8)) * 50}px)` }}>
                {c === " " ? " " : c}
              </span>
            ))}
          </div>
        </div>
        {d.abajo && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, opacity: s(8) }}>
            <div style={{ width: 70 * s(8), height: 22, backgroundColor: acento, borderRadius: 3 }} />
            <div style={{ fontFamily: MONT, fontWeight: 300, fontStyle: "italic", fontSize: 54, color: "white" }}>{d.abajo}</div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export const HabladoPro: React.FC<GuionHabladoPro> = (g) => {
  const { durationInFrames } = useVideoConfig();
  const palabras = g.frases.flatMap((f) => f.palabras);
  const destacados = g.destacados ?? [];
  const apoyos = g.apoyos ?? [];
  const acento = g.acento ?? "#2BD46A";
  const ocultar = (t: number) => destacados.some((d) => t >= d.inicio && t < d.fin);
  const musica = g.musica === undefined ? "house-aldea.mp3" : g.musica;
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Persona g={g} />
      {apoyos.map((a, i) => {
        const de = Math.round(a.inicio * FPS);
        const dur = Math.round((a.fin - a.inicio) * FPS);
        return (
          <React.Fragment key={i}>
            <Sequence from={de} durationInFrames={dur}>
              <ImagenApoyo a={a} />
            </Sequence>
            <Sequence from={de - 5} durationInFrames={12}>
              <Destello />
            </Sequence>
            <Sequence from={de - 3}>
              <Audio src={staticFile("sonidos/whip.mp3")} volume={0.25} />
            </Sequence>
          </React.Fragment>
        );
      })}
      <Subtitulo palabras={palabras} ocultar={ocultar} />
      {destacados.map((d, i) => (
        <React.Fragment key={`d${i}`}>
          <Sequence from={Math.round(d.inicio * FPS)} durationInFrames={Math.round((d.fin - d.inicio) * FPS)}>
            <TituloDestacado d={d} acento={acento} />
          </Sequence>
          <Sequence from={Math.round(d.inicio * FPS)}>
            <Audio src={staticFile("sonidos/pop.mp3")} volume={0.35} />
          </Sequence>
        </React.Fragment>
      ))}
      {musica && (
        <Audio
          src={staticFile(`musica/${musica}`)}
          volume={(f) =>
            (g.volumenMusica ?? 0.13) *
            interpolate(f, [0, 10, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          }
        />
      )}
    </AbsoluteFill>
  );
};
