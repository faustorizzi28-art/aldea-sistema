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
import { FPS } from "./marca";
import type { Apoyo, Destacado, GuionHabladoPro, Palabra } from "./HabladoPro";

// ---------------------------------------------------------------------------
// HABLADO SUAVE: la versión "pro" del estilo hablado. Que no se note la edición:
//  - las tomas ya vienen unidas con fundidos (herramientas/unir-tomas.py)
//  - la cámara avanza lento y parejo (sin saltos de zoom)
//  - las imágenes de apoyo entran y salen con fundido, sin destellos ni "whoosh"
//  - subtítulos por frase corta, que aparecen suave (sin rebote)
//  - destacados que suben con calma, sin sonido
//  - música que baja sola cuando hay voz
// (Las tipografías se cargan en HabladoPro.tsx, que Root importa antes.)
// ---------------------------------------------------------------------------

const MONT = "'Montserrat', sans-serif";
const SOMBRA = "0 3px 12px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.55)";
const FUNDIDO = 8; // cuadros

export const duracionHabladoSuave = (g: GuionHabladoPro) => Math.round(g.segundos * FPS);

const Persona: React.FC<{ g: GuionHabladoPro }> = ({ g }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const escala = interpolate(frame, [0, durationInFrames], [1.0, 1.07]);
  return (
    <AbsoluteFill style={{ transform: `scale(${escala})`, transformOrigin: "50% 35%" }}>
      <OffthreadVideo src={staticFile(`clips/${g.video}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
};

const ImagenApoyo: React.FC<{ a: Apoyo }> = ({ a }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const op = interpolate(frame, [0, FUNDIDO, durationInFrames - FUNDIDO, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zoom = interpolate(frame, [0, durationInFrames], [1.04, 1.1]);
  const tit = interpolate(frame, [FUNDIDO, FUNDIDO + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const estilo: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` };
  return (
    <AbsoluteFill style={{ opacity: op }}>
      {a.video ? (
        <OffthreadVideo src={staticFile(`clips/${a.video}`)} startFrom={Math.round((a.desde ?? 0) * FPS)} muted style={estilo} />
      ) : (
        <Img src={staticFile(`fotos/${a.foto}`)} style={{ ...estilo, objectPosition: `${a.x ?? 50}% 50%` }} />
      )}
      {a.titulo && (
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 560 }}>
          <div
            style={{
              fontFamily: MONT,
              fontWeight: 800,
              fontSize: 58,
              letterSpacing: "0.14em",
              color: "white",
              textShadow: SOMBRA,
              opacity: tit,
              transform: `translateY(${(1 - tit) * 16}px)`,
            }}
          >
            {a.titulo}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// Arma bloques de hasta 3 palabras (cortando en la puntuación) para que se lea tranquilo.
const bloques = (palabras: Palabra[]) => {
  const out: Palabra[][] = [];
  let actual: Palabra[] = [];
  palabras.forEach((w, i) => {
    const prev = palabras[i - 1];
    const corte =
      actual.length >= 3 ||
      actual.map((x) => x.p).join(" ").length + w.p.length > 18 ||
      (prev && (/[.,:;?!…]$/.test(prev.p) || w.i - prev.f > 0.35));
    if (actual.length && corte) {
      out.push(actual);
      actual = [];
    }
    actual.push(w);
  });
  if (actual.length) out.push(actual);
  return out;
};

const Subtitulos: React.FC<{ palabras: Palabra[]; ocultar: (t: number) => boolean }> = ({ palabras, ocultar }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const lista = React.useMemo(() => bloques(palabras), [palabras]);
  if (ocultar(t)) return null;
  const b = lista.find((x, k) => t >= x[0].i - 0.05 && t < (lista[k + 1]?.[0].i ?? x[x.length - 1].f + 0.3) - 0.02 && t < x[x.length - 1].f + 0.4);
  if (!b) return null;
  const f0 = Math.round((b[0].i - 0.05) * FPS);
  const op = interpolate(frame - f0, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 540 }}>
      <div
        style={{
          fontFamily: MONT,
          fontWeight: 800,
          fontSize: 60,
          color: "white",
          textShadow: SOMBRA,
          textAlign: "center",
          maxWidth: 900,
          opacity: op,
          transform: `translateY(${(1 - op) * 8}px)`,
        }}
      >
        {b.map((w) => w.p).join(" ")}
      </div>
    </AbsoluteFill>
  );
};

const TituloDestacado: React.FC<{ d: Destacado; acento: string }> = ({ d, acento }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = (n: number) => spring({ frame: frame - n, fps, config: { damping: 22, stiffness: 110 } });
  const salida = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  const linea = (n: number): React.CSSProperties => ({ opacity: s(n), transform: `translateY(${(1 - s(n)) * 22}px)` });
  const tam = Math.min(140, Math.floor((d.emoji ? 840 : 960) / (d.grande.length * 0.74)));
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 520, opacity: salida }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", textShadow: SOMBRA }}>
        {d.arriba && <div style={{ ...linea(0), fontFamily: MONT, fontWeight: 800, fontSize: 44, color: "white" }}>{d.arriba}</div>}
        <div style={{ ...linea(3), display: "flex", alignItems: "center", gap: 16 }}>
          {d.emoji && <span style={{ fontSize: Math.round(tam * 0.6) }}>{d.emoji}</span>}
          <span style={{ fontFamily: MONT, fontWeight: 900, fontStyle: "italic", fontSize: tam, lineHeight: 0.98, color: "white", whiteSpace: "nowrap" }}>
            {d.grande}
          </span>
        </div>
        {d.abajo && (
          <div style={{ ...linea(7), display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
            <div style={{ width: 60, height: 18, backgroundColor: acento, borderRadius: 3 }} />
            <div style={{ fontFamily: MONT, fontWeight: 300, fontStyle: "italic", fontSize: 50, color: "white" }}>{d.abajo}</div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export const HabladoSuave: React.FC<GuionHabladoPro> = (g) => {
  const { durationInFrames } = useVideoConfig();
  const palabras = React.useMemo(() => g.frases.flatMap((f) => f.palabras), [g.frases]);
  const destacados = g.destacados ?? [];
  const ocultar = (t: number) => destacados.some((d) => t >= d.inicio && t < d.fin);
  const musica = g.musica === undefined ? null : g.musica;
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Persona g={g} />
      {(g.apoyos ?? []).map((a, i) => (
        <Sequence key={i} from={Math.round(a.inicio * FPS)} durationInFrames={Math.round((a.fin - a.inicio) * FPS)}>
          <ImagenApoyo a={a} />
        </Sequence>
      ))}
      {/* viñeta suave: da look de cámara y ayuda a leer los textos */}
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 40%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)" }} />
      <Subtitulos palabras={palabras} ocultar={ocultar} />
      {destacados.map((d, i) => (
        <Sequence key={`d${i}`} from={Math.round(d.inicio * FPS)} durationInFrames={Math.round((d.fin - d.inicio) * FPS)}>
          <TituloDestacado d={d} acento={g.acento ?? "#F2CA11"} />
        </Sequence>
      ))}
      {musica && (
        <Audio
          src={staticFile(`musica/${musica}`)}
          volume={(f) => {
            const t = f / FPS;
            const bajo = g.volumenMusica ?? 0.13;
            const alto = g.volumenMusicaSinVoz ?? bajo;
            let cerca = 99;
            for (const fr of g.frases) {
              const d = t < fr.inicio ? fr.inicio - t : t > fr.fin ? t - fr.fin : 0;
              cerca = Math.min(cerca, d);
            }
            const v = bajo + (alto - bajo) * Math.min(1, Math.max(0, (cerca - 0.1) / 0.4));
            const fin = g.musicaHasta ?? durationInFrames / FPS;
            const fade = interpolate(t, [0, 0.4, fin - 1.5, fin], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return v * fade;
          }}
        />
      )}
    </AbsoluteFill>
  );
};
