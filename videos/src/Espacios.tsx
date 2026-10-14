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
import { TransitionPresentation, TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";
import { FPS } from "./marca";

// ---------------------------------------------------------------------------
// PRESENTACIÓN DE ESPACIOS: video institucional de un lugar, espacio por espacio.
// Sirve en vertical (Reels/historias/TikTok) y horizontal (Facebook/YouTube/WhatsApp).
// Identidad de Aldea de Valle: verde, crema y amarillo; Instrument Serif + Archivo.
// ---------------------------------------------------------------------------

const ALDEA = {
  verde: "#2F4A38",
  verdeOscuro: "#1E3226",
  crema: "#F4EFE3",
  amarillo: "#F2CA11",
};

const SERIF = "'Instrument Serif', serif";
const SANS = "'Archivo', sans-serif";

loadFont({ family: "Instrument Serif", url: staticFile("fonts/instrument-serif-latin-400-normal.woff2"), weight: "400" });
loadFont({
  family: "Instrument Serif",
  url: staticFile("fonts/instrument-serif-latin-400-italic.woff2"),
  weight: "400",
  style: "italic",
});
loadFont({ family: "Archivo", url: staticFile("fonts/archivo-latin-500-normal.woff2"), weight: "500" });
loadFont({ family: "Archivo", url: staticFile("fonts/archivo-latin-700-normal.woff2"), weight: "700" });
loadFont({ family: "Archivo", url: staticFile("fonts/archivo-latin-800-normal.woff2"), weight: "800" });

export type Espacio = {
  nombre: string; // "Salón cerrado"
  descripcion: string; // una línea corta
  foto?: string; // en public/fotos
  video?: string; // en public/clips (versión vertical)
  videoHorizontal?: string; // en public/clips (versión horizontal)
  desde?: number; // segundo del clip
  segundos?: number; // por defecto 3.3
  paneo?: "izq" | "der"; // recorrido de la foto en el formato vertical
};

export type GuionEspacios = {
  titulo: string;
  intro: { linea1: string; linea2: string; video?: string; videoHorizontal?: string };
  espacios: Espacio[];
  cierre: { llamado: string; direccion: string; whatsapp: string; usuario: string };
  musica?: string | null;
  volumenMusica?: number;
};

const T = 14; // cuadros de cada transición
const SEG_INTRO = 3.6;
const SEG_CIERRE = 5.2;
const segEspacio = (e: Espacio) => e.segundos ?? 4.3;

export const duracionEspacios = (g: GuionEspacios) =>
  Math.round(SEG_INTRO * FPS) +
  g.espacios.reduce((t, e) => t + Math.round(segEspacio(e) * FPS), 0) +
  Math.round(SEG_CIERRE * FPS) -
  (g.espacios.length + 1) * T;

const useVertical = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

// Logo oficial de Aldea (la carpa), recortado con fondo transparente.
const Logo: React.FC<{ size: number }> = ({ size }) => (
  <Img src={staticFile("fotos/logo-aldea.png")} style={{ height: size, width: "auto", display: "block" }} />
);

const Medio: React.FC<{ foto?: string; video?: string; desde?: number; paneo?: Espacio["paneo"] }> = ({
  foto,
  video,
  desde,
  paneo,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const vertical = useVertical();
  const zoom = interpolate(frame, [0, durationInFrames], [1.02, 1.1]);
  if (video) {
    return (
      <OffthreadVideo
        src={staticFile(`clips/${video}`)}
        startFrom={Math.round((desde ?? 0) * FPS)}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }}
      />
    );
  }
  const x = vertical && paneo ? interpolate(frame, [0, durationInFrames], paneo === "der" ? [15, 85] : [85, 15]) : 50;
  return (
    <Img
      src={staticFile(`fotos/${foto}`)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: `${x}% 50%`,
        transform: `scale(${zoom})`,
      }}
    />
  );
};

const Intro: React.FC<{ g: GuionEspacios }> = ({ g }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = useVertical();
  const logo = spring({ frame, fps, config: { damping: 12 } });
  const t1 = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const t2 = spring({ frame: frame - 18, fps, config: { damping: 14 } });
  const video = vertical ? g.intro.video : g.intro.videoHorizontal ?? g.intro.video;
  return (
    <AbsoluteFill style={{ backgroundColor: ALDEA.verde }}>
      {video && (
        <AbsoluteFill style={{ opacity: 0.45 }}>
          <Medio video={video} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ backgroundColor: "rgba(30,50,38,0.55)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: vertical ? 30 : 18, textAlign: "center" }}>
        <div style={{ transform: `scale(${logo})` }}>
          <Logo size={vertical ? 230 : 190} />
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: vertical ? 150 : 140,
            lineHeight: 1,
            color: ALDEA.crema,
            opacity: t1,
            transform: `translateY(${(1 - t1) * 40}px)`,
          }}
        >
          {g.intro.linea1}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: vertical ? 40 : 36,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: ALDEA.amarillo,
            opacity: t2,
            transform: `translateY(${(1 - t2) * 30}px)`,
          }}
        >
          {g.intro.linea2}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Placa: React.FC<{ e: Espacio; numero: number; total: number }> = ({ e, numero, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = useVertical();
  const a = spring({ frame: frame - T, fps, config: { damping: 15 } });
  const b = spring({ frame: frame - T - 6, fps, config: { damping: 15 } });
  const linea = interpolate(frame, [T, T + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const video = vertical ? e.video : e.videoHorizontal ?? e.video;
  return (
    <AbsoluteFill style={{ backgroundColor: ALDEA.verdeOscuro }}>
      <Medio foto={e.foto} video={video} desde={e.desde} paneo={e.paneo} />
      <AbsoluteFill
        style={{
          background: vertical
            ? "linear-gradient(180deg, rgba(30,50,38,0) 45%, rgba(30,50,38,0.55) 68%, rgba(30,50,38,0.92) 100%)"
            : "linear-gradient(90deg, rgba(30,50,38,0.9) 0%, rgba(30,50,38,0.55) 38%, rgba(30,50,38,0) 62%)",
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "flex-start",
          padding: vertical ? "0 80px 330px" : "0 110px 120px",
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: vertical ? 34 : 28,
            letterSpacing: "0.2em",
            color: ALDEA.amarillo,
            opacity: a,
          }}
        >
          {String(numero).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
        <div style={{ width: (vertical ? 120 : 100) * linea, height: 5, backgroundColor: ALDEA.amarillo, margin: "18px 0 22px" }} />
        <div
          style={{
            fontFamily: SERIF,
            fontSize: vertical ? 132 : 118,
            lineHeight: 0.95,
            color: ALDEA.crema,
            opacity: a,
            transform: `translateY(${(1 - a) * 50}px)`,
            maxWidth: vertical ? 920 : 820,
          }}
        >
          {e.nombre}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: vertical ? 42 : 36,
            lineHeight: 1.3,
            color: ALDEA.crema,
            marginTop: 20,
            opacity: b * 0.95,
            transform: `translateY(${(1 - b) * 30}px)`,
            maxWidth: vertical ? 900 : 720,
          }}
        >
          {e.descripcion}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Cierre: React.FC<{ g: GuionEspacios }> = ({ g }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = useVertical();
  const s = (d: number) => spring({ frame: frame - T - d, fps, config: { damping: 14 } });
  const item = (d: number): React.CSSProperties => ({ opacity: s(d), transform: `translateY(${(1 - s(d)) * 30}px)` });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: ALDEA.verde,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        gap: vertical ? 34 : 22,
        padding: 80,
      }}
    >
      <div style={item(0)}>
        <Logo size={vertical ? 190 : 150} />
      </div>
      <div style={{ ...item(4), fontFamily: SERIF, fontSize: vertical ? 120 : 110, lineHeight: 1, color: ALDEA.crema }}>
        {g.cierre.llamado}
      </div>
      <div
        style={{
          ...item(10),
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: vertical ? 46 : 40,
          letterSpacing: "0.08em",
          backgroundColor: ALDEA.amarillo,
          color: ALDEA.verde,
          padding: vertical ? "22px 44px" : "18px 40px",
          borderRadius: 999,
        }}
      >
        WhatsApp {g.cierre.whatsapp}
      </div>
      <div style={{ ...item(16), fontFamily: SANS, fontWeight: 500, fontSize: vertical ? 36 : 30, color: ALDEA.crema, lineHeight: 1.4 }}>
        {g.cierre.direccion}
        <br />
        <span style={{ color: ALDEA.amarillo, fontWeight: 700 }}>{g.cierre.usuario}</span>
      </div>
    </AbsoluteFill>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transiciones: TransitionPresentation<any>[] = [
  slide({ direction: "from-right" }),
  wipe({ direction: "from-left" }),
  slide({ direction: "from-bottom" }),
  wipe({ direction: "from-right" }),
];

export const Espacios: React.FC<GuionEspacios> = (g) => {
  const { durationInFrames } = useVideoConfig();
  const piezas: React.ReactNode[] = [];
  piezas.push(
    <TransitionSeries.Sequence key="intro" durationInFrames={Math.round(SEG_INTRO * FPS)}>
      <Intro g={g} />
      <Audio src={staticFile("sonidos/subida.mp3")} volume={0.35} />
    </TransitionSeries.Sequence>,
  );
  g.espacios.forEach((e, i) => {
    piezas.push(
      <TransitionSeries.Transition
        key={`t${i}`}
        presentation={transiciones[i % transiciones.length]}
        timing={linearTiming({ durationInFrames: T })}
      />,
      <TransitionSeries.Sequence key={`e${i}`} durationInFrames={Math.round(segEspacio(e) * FPS)}>
        <Placa e={e} numero={i + 1} total={g.espacios.length} />
        <Audio src={staticFile("sonidos/whoosh.mp3")} volume={0.35} />
      </TransitionSeries.Sequence>,
    );
  });
  piezas.push(
    <TransitionSeries.Transition key="tc" presentation={fade()} timing={linearTiming({ durationInFrames: T })} />,
    <TransitionSeries.Sequence key="cierre" durationInFrames={Math.round(SEG_CIERRE * FPS)}>
      <Cierre g={g} />
      <Sequence from={T}>
        <Audio src={staticFile("sonidos/impacto.mp3")} volume={0.6} />
      </Sequence>
    </TransitionSeries.Sequence>,
  );
  const musica = g.musica === undefined ? "ritmo-entreno.mp3" : g.musica;
  return (
    <AbsoluteFill style={{ backgroundColor: ALDEA.verdeOscuro }}>
      <TransitionSeries>{piezas}</TransitionSeries>
      {musica && (
        <Audio
          src={staticFile(`musica/${musica}`)}
          loop
          volume={(f) =>
            (g.volumenMusica ?? 0.45) *
            interpolate(f, [0, 10, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      )}
    </AbsoluteFill>
  );
};
