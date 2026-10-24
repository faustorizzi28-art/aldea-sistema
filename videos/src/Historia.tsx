import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/fonts";
import { FPS, MARCA } from "./marca";

loadFont({ family: "Bebas Neue", url: staticFile("fonts/bebas-neue-latin-400-normal.woff2"), weight: "400" });

// ---------------------------------------------------------------------------
// HISTORIA: video corto para historias (10–15 s). Tomas que se funden entre sí,
// una frase por toma y una placa final. Edición tranquila, sin efectos ruidosos.
// Deja libre el tercio de abajo de la placa final para pegar un sticker (encuesta, pregunta).
// ---------------------------------------------------------------------------
const MONT = "'Montserrat', sans-serif";
const SOMBRA = "0 3px 14px rgba(0,0,0,0.55)";
const FUNDIDO = 10;

export type TomaHistoria = {
  foto?: string;
  video?: string;
  desde?: number;
  segundos: number;
  texto?: string;
  x?: number;
  fondo?: string; // sin foto ni video: fondo de color liso
  lista?: string[]; // renglones que aparecen de a uno (para "lo que incluye")
};
export type GuionHistoria = {
  titulo: string;
  tomas: TomaHistoria[];
  cierre: { arriba?: string; texto: string; color?: string; segundos: number; logo?: string; boton?: string; abajo?: string };
  letra?: "montserrat" | "bebas" | "serif"; // tipografía de los textos grandes ("serif": look elegante de Aldea)
  acento?: string;
  musica?: string | null;
  volumenMusica?: number;
};

export const duracionHistoria = (g: GuionHistoria) =>
  Math.round((g.tomas.reduce((t, x) => t + x.segundos, 0) + g.cierre.segundos) * FPS);

const BEBAS = "'Bebas Neue', sans-serif";
// (Instrument Serif y Archivo se cargan en Espacios.tsx, que Root importa.)
const SERIF = "'Instrument Serif', serif";
const SANS = "'Archivo', sans-serif";

// Estilo de los textos grandes según la tipografía elegida.
const letraGrande = (letra: string | undefined, tam: { bebas: number; mont: number; serif: number }): React.CSSProperties =>
  letra === "bebas"
    ? { fontFamily: BEBAS, fontWeight: 400, fontSize: tam.bebas, letterSpacing: "0.01em", lineHeight: 0.95 }
    : letra === "serif"
      ? { fontFamily: SERIF, fontWeight: 400, fontSize: tam.serif, lineHeight: 1.02, letterSpacing: "-0.01em" }
      : { fontFamily: MONT, fontWeight: 900, fontStyle: "italic", fontSize: tam.mont, lineHeight: 1 };

const Toma: React.FC<{ t: TomaHistoria; primera: boolean; letra?: string; acento?: string }> = ({ t, primera, letra, acento }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const op = primera ? 1 : interpolate(frame, [0, FUNDIDO], [0, 1], { extrapolateRight: "clamp" });
  const zoom = interpolate(frame, [0, durationInFrames], [1.03, 1.1]);
  const txt = interpolate(frame, [FUNDIDO, FUNDIDO + 10, durationInFrames - 4, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const estilo: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` };
  return (
    <AbsoluteFill style={{ opacity: op, backgroundColor: "black" }}>
      {t.video ? (
        <OffthreadVideo src={staticFile(`clips/${t.video}`)} startFrom={Math.round((t.desde ?? 0) * FPS)} muted style={estilo} />
      ) : t.foto ? (
        <Img src={staticFile(`fotos/${t.foto}`)} style={{ ...estilo, objectPosition: `${t.x ?? 50}% 50%` }} />
      ) : (
        <AbsoluteFill style={{ backgroundColor: t.fondo ?? MARCA.rojo }} />
      )}
      {t.lista && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 26, paddingTop: 160 }}>
          {t.lista.map((r, k) => {
            const v = interpolate(frame, [FUNDIDO + 6 + k * 9, FUNDIDO + 16 + k * 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div
                key={k}
                style={{
                  fontFamily: MONT,
                  fontWeight: 800,
                  fontSize: 68,
                  color: "white",
                  opacity: v,
                  transform: `translateX(${(1 - v) * -40}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <span style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: acento ?? MARCA.amarillo, display: "inline-block" }} />
                {r}
              </div>
            );
          })}
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.45) 100%)" }} />
      {t.texto && (
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 300 }}>
          <div
            style={{
              ...letraGrande(letra, { bebas: 140, mont: 96, serif: 118 }),
              color: "white",
              textShadow: SOMBRA,
              textAlign: "center",
              maxWidth: 920,
              whiteSpace: "pre-line",
              opacity: txt,
              transform: `translateY(${(1 - txt) * 18}px)`,
            }}
          >
            {t.texto}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

const Cierre: React.FC<{ c: GuionHistoria["cierre"]; letra?: string; acento?: string }> = ({ c, letra, acento }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, FUNDIDO], [0, 1], { extrapolateRight: "clamp" });
  const v = (d: number) => interpolate(frame, [d, d + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sube = (d: number): React.CSSProperties => ({ opacity: v(d), transform: `translateY(${(1 - v(d)) * 20}px)` });
  return (
    <AbsoluteFill style={{ backgroundColor: c.color ?? MARCA.rojo, opacity: op, alignItems: "center", paddingTop: c.logo ? 300 : 420, gap: 30 }}>
      {c.logo && <Img src={staticFile(`fotos/${c.logo}`)} style={{ maxWidth: 760, maxHeight: 380, width: "auto", height: "auto", ...sube(6) }} />}
      {c.arriba && (
        <div style={{ fontFamily: letra === "serif" ? SANS : MONT, fontWeight: letra === "serif" ? 500 : 800, fontSize: letra === "serif" ? 34 : 44, letterSpacing: letra === "serif" ? "0.32em" : "0.18em", color: acento ?? MARCA.amarillo, ...sube(8) }}>{c.arriba}</div>
      )}
      <div
        style={{
          ...letraGrande(letra, { bebas: 150, mont: 104, serif: 124 }),
          color: "white",
          textAlign: "center",
          maxWidth: 900,
          whiteSpace: "pre-line",
          ...sube(16),
        }}
      >
        {c.texto}
      </div>
      {c.boton && (
        <div
          style={{
            fontFamily: letra === "serif" ? SANS : MONT,
            fontWeight: letra === "serif" ? 500 : 800,
            fontSize: letra === "serif" ? 40 : 50,
            letterSpacing: letra === "serif" ? "0.08em" : undefined,
            color: letra === "serif" ? acento ?? "white" : c.color ?? MARCA.rojo,
            backgroundColor: letra === "serif" ? "transparent" : "white",
            border: letra === "serif" ? `2px solid ${acento ?? "white"}` : undefined,
            padding: "22px 46px",
            borderRadius: 999,
            ...sube(26),
          }}
        >
          {c.boton}
        </div>
      )}
      {c.abajo && <div style={{ fontFamily: letra === "serif" ? SANS : MONT, fontWeight: letra === "serif" ? 500 : 600, fontSize: letra === "serif" ? 34 : 38, letterSpacing: letra === "serif" ? "0.06em" : undefined, color: "white", ...sube(34) }}>{c.abajo}</div>}
    </AbsoluteFill>
  );
};

export const Historia: React.FC<GuionHistoria> = (g) => {
  const { durationInFrames } = useVideoConfig();
  let desde = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {g.tomas.map((t, i) => {
        const ini = desde;
        const dur = Math.round(t.segundos * FPS);
        desde += dur;
        return (
          <Sequence key={i} from={Math.max(0, ini - (i ? FUNDIDO : 0))} durationInFrames={dur + (i ? FUNDIDO : 0) + FUNDIDO}>
            <Toma t={t} primera={i === 0} letra={g.letra} acento={g.acento} />
          </Sequence>
        );
      })}
      <Sequence from={desde - FUNDIDO}>
        <Cierre c={g.cierre} letra={g.letra} acento={g.acento} />
      </Sequence>
      {g.musica && (
        <Audio
          src={staticFile(`musica/${g.musica}`)}
          volume={(f) =>
            (g.volumenMusica ?? 0.5) *
            interpolate(f, [0, 8, durationInFrames - 25, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          }
        />
      )}
    </AbsoluteFill>
  );
};
