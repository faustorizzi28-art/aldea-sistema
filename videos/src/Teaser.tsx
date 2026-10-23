import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FPS } from "./marca";

// ---------------------------------------------------------------------------
// TEASER: video de expectativa, intenso. Pantallas oscuras, frases cortas que aparecen
// con los latidos de la música, parpadeos, silencio y revelación final.
// Cada escena puede llevar foto o video de fondo (se oscurece y desatura).
// ---------------------------------------------------------------------------
const MONT = "'Montserrat', sans-serif";

export type EscenaTeaser = { desde: number; hasta: number; texto: string; foto?: string; video?: string; videoDesde?: number; chico?: boolean };
export type GuionTeaser = {
  titulo: string;
  segundos: number;
  escenas: EscenaTeaser[];
  revelacion: { desde: number; arriba: string; grande: string; abajo?: string; foto?: string; color?: string; logo?: string };
  musica: string;
};

export const duracionTeaser = (g: GuionTeaser) => Math.round(g.segundos * FPS);

const Fondo: React.FC<{ foto?: string; video?: string; desde?: number }> = ({ foto, video, desde }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1.08, 1.18]);
  const st: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})`, filter: "saturate(0.55) contrast(1.15) brightness(0.55)" };
  if (video) return <OffthreadVideo src={staticFile(`clips/${video}`)} startFrom={Math.round((desde ?? 0) * FPS)} muted style={st} />;
  if (foto) return <Img src={staticFile(`fotos/${foto}`)} style={st} />;
  // sin imagen: luz tenue que se mueve en la oscuridad
  const x = 50 + Math.sin(frame / 40) * 18;
  return <AbsoluteFill style={{ background: `radial-gradient(60% 40% at ${x}% 55%, rgba(120,90,60,0.35), rgba(0,0,0,0) 70%), #050505` }} />;
};

const Frase: React.FC<{ e: EscenaTeaser }> = ({ e }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const entra = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const sale = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  // parpadeo nervioso al entrar
  const flick = frame < 10 ? (random(`f${e.texto}${frame}`) > 0.45 ? 1 : 0.15) : 1;
  const sep = interpolate(frame, [0, 18], [0.35, 0.02], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: Math.min(entra, sale) * flick }}>
      <Fondo foto={e.foto} video={e.video} desde={e.videoDesde} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 90 }}>
        <div
          style={{
            fontFamily: MONT,
            fontWeight: 900,
            fontSize: e.chico ? 74 : 112,
            lineHeight: 1.05,
            letterSpacing: `${sep}em`,
            color: "white",
            textAlign: "center",
            whiteSpace: "pre-line",
            textShadow: "0 0 40px rgba(0,0,0,0.9)",
            transform: `scale(${interpolate(frame, [0, durationInFrames], [1, 1.06])})`,
          }}
        >
          {e.texto}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Revelacion: React.FC<{ r: GuionTeaser["revelacion"] }> = ({ r }) => {
  const frame = useCurrentFrame();
  const flash = interpolate(frame, [0, 2, 14], [1, 1, 0], { extrapolateRight: "clamp" });
  const v = (d: number) => interpolate(frame, [d, d + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const zoom = interpolate(frame, [0, 140], [1.25, 1.05], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {r.foto ? (
        <Img src={staticFile(`fotos/${r.foto}`)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})`, filter: "brightness(0.6)" }} />
      ) : (
        <AbsoluteFill style={{ background: `radial-gradient(80% 60% at 50% 45%, ${r.color ?? "#E8892B"}, #062a33 75%, #020c10)`, transform: `scale(${zoom})` }} />
      )}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 28, padding: 70, textAlign: "center" }}>
        {r.logo && (
          <Img
            src={staticFile(`fotos/${r.logo}`)}
            style={{ width: 900, height: "auto", opacity: v(2), transform: `scale(${0.85 + 0.15 * v(2)}) rotate(${(1 - v(2)) * -4}deg)`, filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.45))" }}
          />
        )}
        <div style={{ fontFamily: MONT, fontWeight: 800, fontSize: 46, letterSpacing: "0.3em", color: "#FFE9C7", opacity: v(6) }}>{r.arriba}</div>
        {r.grande && <div style={{ fontFamily: MONT, fontWeight: 900, fontSize: 150, lineHeight: 0.95, color: "white", whiteSpace: "pre-line", opacity: v(2), transform: `scale(${0.9 + 0.1 * v(2)})`, textShadow: "0 10px 50px rgba(0,0,0,0.5)" }}>
          {r.grande}
        </div>}
        {r.abajo && <div style={{ fontFamily: MONT, fontWeight: 600, fontSize: 48, color: "white", opacity: v(40), whiteSpace: "pre-line", marginTop: 20 }}>{r.abajo}</div>}
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "white", opacity: flash }} />
    </AbsoluteFill>
  );
};

const Grano: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: 0.12, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%" aria-hidden="true">
        <filter id={`g${frame}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 50} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${frame})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Teaser: React.FC<GuionTeaser> = (g) => {
  const f = (s: number) => Math.round(s * FPS);
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {g.escenas.map((e, i) => (
        <Sequence key={i} from={f(e.desde)} durationInFrames={f(e.hasta - e.desde)}>
          <Frase e={e} />
        </Sequence>
      ))}
      <Sequence from={f(g.revelacion.desde)}>
        <Revelacion r={g.revelacion} />
      </Sequence>
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.75) 100%)" }} />
      <Grano />
      {/* franjas negras de cine (formato panorámico), se abren en la revelación */}
      {(() => {
        const frame = useCurrentFrame();
        const h = interpolate(frame, [f(g.revelacion.desde) - 2, f(g.revelacion.desde) + 20], [330, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: h, backgroundColor: "black" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: h, backgroundColor: "black" }} />
          </>
        );
      })()}
      <Audio src={staticFile(`musica/${g.musica}`)} />
    </AbsoluteFill>
  );
};
