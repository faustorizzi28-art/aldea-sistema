import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FPS, MARCA } from "./marca";

// ---------------------------------------------------------------------------
// VIDEO HABLADO: para cuando Fausto graba con el celu hablando a cámara.
// Se le suman: zooms de ritmo, título, subtítulos, música bajita, barra y cierre de marca.
// ---------------------------------------------------------------------------
export type Subtitulo = { texto: string; inicio: number; fin: number; destacar?: string };

export type GuionHablado = {
  titulo: string;
  video: string; // archivo en public/clips (ya pasado a 1080x1920)
  segundos: number; // duración del clip
  gancho?: string; // texto grande que aparece los primeros segundos
  subtitulos?: Subtitulo[];
  zoomCada?: number; // cada cuántos segundos cambia el encuadre (por defecto 4)
  musica?: string | null;
  volumenMusica?: number; // bajito: la voz manda (por defecto 0.08)
  cierre?: string; // texto de la placa final (por defecto la frase madre)
};

const SEGUNDOS_CIERRE = 3;

export const duracionHablado = (g: GuionHablado) => Math.round((g.segundos + SEGUNDOS_CIERRE) * FPS);

// Cortes de encuadre: alterna plano normal y plano más cerrado, como en los reels editados.
const VideoConZooms: React.FC<{ g: GuionHablado }> = ({ g }) => {
  const frame = useCurrentFrame();
  const tramo = Math.floor(frame / ((g.zoomCada ?? 4) * FPS));
  const escala = [1, 1.18, 1.06, 1.25][tramo % 4];
  // el plano cerrado apunta a la cara (un poco arriba del centro)
  return (
    <AbsoluteFill style={{ transform: `scale(${escala})`, transformOrigin: "50% 35%" }}>
      <OffthreadVideo src={staticFile(`clips/${g.video}`)} />
    </AbsoluteFill>
  );
};

const Gancho: React.FC<{ texto: string }> = ({ texto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame, fps, config: { damping: 10 } });
  const salida = interpolate(frame, [80, 95], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 260 }}>
      <div
        style={{
          transform: `scale(${entrada}) rotate(-2deg)`,
          opacity: salida,
          backgroundColor: MARCA.amarillo,
          color: MARCA.negro,
          fontFamily: MARCA.tipografia,
          fontWeight: 900,
          fontSize: 78,
          lineHeight: 1.1,
          padding: "22px 36px",
          borderRadius: 18,
          maxWidth: 900,
          textAlign: "center",
          textTransform: "uppercase",
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};

const Subtitulos: React.FC<{ lista: Subtitulo[] }> = ({ lista }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seg = frame / fps;
  const actual = lista.find((s) => seg >= s.inicio && seg < s.fin);
  if (!actual) return null;
  const pop = spring({ frame: frame - Math.round(actual.inicio * fps), fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 430 }}>
      <div
        style={{
          transform: `scale(${0.85 + pop * 0.15})`,
          fontFamily: MARCA.tipografia,
          fontWeight: 900,
          fontSize: 70,
          lineHeight: 1.15,
          color: MARCA.blanco,
          textAlign: "center",
          maxWidth: 940,
          WebkitTextStroke: "3px black",
          paintOrder: "stroke",
          textShadow: "0 6px 18px rgba(0,0,0,0.7)",
        }}
      >
        {actual.texto.split(" ").map((p, i) => {
          const limpia = p.replace(/[.,!?¿¡:;]/g, "").toLowerCase();
          const resaltada = actual.destacar && limpia === actual.destacar.toLowerCase();
          return (
            <span key={i} style={{ color: resaltada ? MARCA.amarillo : undefined }}>
              {p}{" "}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const PlacaCierre: React.FC<{ texto: string }> = ({ texto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: MARCA.rojo,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" }),
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - entrada) * 80}px)`,
          fontFamily: MARCA.tipografia,
          fontWeight: 900,
          fontSize: 96,
          lineHeight: 1.12,
          color: MARCA.blanco,
          textAlign: "center",
        }}
      >
        {texto}
      </div>
      <div style={{ marginTop: 60, fontFamily: MARCA.tipografia, fontWeight: 700, fontSize: 46, color: MARCA.amarillo }}>
        {MARCA.usuario}
      </div>
    </AbsoluteFill>
  );
};

export const VideoHablado: React.FC<GuionHablado> = (g) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const finClip = Math.round(g.segundos * FPS);
  const musica = g.musica === undefined ? "ritmo-entreno.mp3" : g.musica;
  return (
    <AbsoluteFill style={{ backgroundColor: MARCA.negro }}>
      <Sequence durationInFrames={finClip}>
        <VideoConZooms g={g} />
        {g.subtitulos && <Subtitulos lista={g.subtitulos} />}
        {g.gancho && (
          <Sequence durationInFrames={100}>
            <Gancho texto={g.gancho} />
          </Sequence>
        )}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: 14,
            width: `${(frame / finClip) * 100}%`,
            backgroundColor: MARCA.amarillo,
          }}
        />
      </Sequence>
      <Sequence from={finClip}>
        <PlacaCierre texto={g.cierre ?? MARCA.fraseMadre} />
        <Audio src={staticFile("sonidos/impacto.mp3")} volume={0.7} />
      </Sequence>
      {musica && (
        <Audio
          src={staticFile(`musica/${musica}`)}
          loop
          volume={(f) => {
            const base = g.volumenMusica ?? 0.08;
            // durante la voz va bajita; en el cierre sube
            const sube = interpolate(f, [finClip - 5, finClip + 5], [base, 0.4], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const fade = interpolate(f, [durationInFrames - 25, durationInFrames], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return sube * fade;
          }}
        />
      )}
    </AbsoluteFill>
  );
};
