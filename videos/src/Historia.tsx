import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FPS, MARCA } from "./marca";

// ---------------------------------------------------------------------------
// HISTORIA: video corto para historias (10–15 s). Tomas que se funden entre sí,
// una frase por toma y una placa final. Edición tranquila, sin efectos ruidosos.
// Deja libre el tercio de abajo de la placa final para pegar un sticker (encuesta, pregunta).
// ---------------------------------------------------------------------------
const MONT = "'Montserrat', sans-serif";
const SOMBRA = "0 3px 14px rgba(0,0,0,0.55)";
const FUNDIDO = 10;

export type TomaHistoria = { foto?: string; video?: string; desde?: number; segundos: number; texto?: string; x?: number };
export type GuionHistoria = {
  titulo: string;
  tomas: TomaHistoria[];
  cierre: { arriba?: string; texto: string; color?: string; segundos: number };
  musica?: string | null;
  volumenMusica?: number;
};

export const duracionHistoria = (g: GuionHistoria) =>
  Math.round((g.tomas.reduce((t, x) => t + x.segundos, 0) + g.cierre.segundos) * FPS);

const Toma: React.FC<{ t: TomaHistoria; primera: boolean }> = ({ t, primera }) => {
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
      ) : (
        <Img src={staticFile(`fotos/${t.foto}`)} style={{ ...estilo, objectPosition: `${t.x ?? 50}% 50%` }} />
      )}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.45) 100%)" }} />
      {t.texto && (
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 300 }}>
          <div
            style={{
              fontFamily: MONT,
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: 96,
              lineHeight: 1,
              color: "white",
              textShadow: SOMBRA,
              textAlign: "center",
              maxWidth: 920,
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

const Cierre: React.FC<{ c: GuionHistoria["cierre"] }> = ({ c }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, FUNDIDO], [0, 1], { extrapolateRight: "clamp" });
  const a = interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const b = interpolate(frame, [16, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: c.color ?? MARCA.rojo, opacity: op, alignItems: "center", paddingTop: 420 }}>
      {c.arriba && (
        <div style={{ fontFamily: MONT, fontWeight: 800, fontSize: 44, letterSpacing: "0.18em", color: MARCA.amarillo, opacity: a, marginBottom: 30 }}>
          {c.arriba}
        </div>
      )}
      <div
        style={{
          fontFamily: MONT,
          fontWeight: 900,
          fontStyle: "italic",
          fontSize: 104,
          lineHeight: 1.02,
          color: "white",
          textAlign: "center",
          maxWidth: 900,
          opacity: b,
          transform: `translateY(${(1 - b) * 20}px)`,
        }}
      >
        {c.texto}
      </div>
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
            <Toma t={t} primera={i === 0} />
          </Sequence>
        );
      })}
      <Sequence from={desde - FUNDIDO}>
        <Cierre c={g.cierre} />
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
