import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { GuionEspacios, Espacio } from "./Espacios";

// ---------------------------------------------------------------------------
// ESPACIOS PRO: la misma presentación de espacios, con edición "de tendencia":
// - todo cortado al ritmo de la música (120 bpm: 1 tiempo = 15 cuadros, 1 compás = 2 s)
// - intro que "sube" y DROP cuando aparece el primer espacio (segundo 4)
// - transiciones rápidas: latigazo (whip) con desenfoque, zoom con desenfoque y glitch RGB
// - pulso de zoom en cada tiempo, flash en los golpes, grano de película y destellos de luz
// - títulos que se revelan desde una máscara, palabra por palabra
// - cámara lenta en los clips de video
// (Las tipografías se cargan en Espacios.tsx, que Root importa antes.)
// ---------------------------------------------------------------------------

const ALDEA = { verde: "#2F4A38", verdeOscuro: "#1E3226", crema: "#F4EFE3", amarillo: "#F2CA11" };
const SERIF = "'Instrument Serif', serif";
const SANS = "'Archivo', sans-serif";

const TIEMPO = 15; // cuadros por tiempo a 120 bpm y 30 fps
const ESCENA = 8 * TIEMPO; // 2 compases = 4 s por espacio
const T = 9; // cuadros de transición (rápidas, ~0.3 s)
const CIERRE = 11 * TIEMPO;

type Transicion = "whip" | "zoom" | "glitch" | "whipArriba";
const CICLO: Transicion[] = ["whip", "zoom", "glitch", "whipArriba", "zoom", "whip", "glitch"];

export const duracionEspaciosPro = (g: GuionEspacios) => ESCENA * (1 + g.espacios.length) + CIERRE;

const useVertical = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

const Logo: React.FC<{ size: number }> = ({ size }) => (
  <Img src={staticFile("fotos/logo-aldea.png")} style={{ height: size, width: "auto", display: "block" }} />
);

// Pulso: cada tiempo de la música la imagen "late" un poquito.
const pulso = (frame: number, fuerza = 0.025) => {
  const f = frame % TIEMPO;
  return 1 + fuerza * Math.exp(-f / 3.5);
};

// Grano de película: ruido que cambia en cada cuadro.
const Grano: React.FC = () => {
  const frame = useCurrentFrame();
  const semilla = Math.floor(random(`grano-${frame}`) * 1000);
  return (
    <AbsoluteFill style={{ opacity: 0.09, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%" aria-hidden="true">
        <filter id={`g${frame}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={semilla} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${frame})`} />
      </svg>
    </AbsoluteFill>
  );
};

// Destello de luz cálido que cruza la pantalla en cada transición.
const Destello: React.FC<{ progreso: number; lado: number }> = ({ progreso, lado }) => {
  const op = Math.sin(Math.PI * Math.min(1, Math.max(0, progreso)));
  const x = lado > 0 ? 120 - progreso * 140 : -20 + progreso * 140;
  return (
    <AbsoluteFill
      style={{
        mixBlendMode: "screen",
        opacity: op * 0.85,
        background: `radial-gradient(60% 45% at ${x}% 40%, rgba(255,190,90,0.95), rgba(255,120,40,0.35) 45%, rgba(0,0,0,0) 70%)`,
      }}
    />
  );
};

const Medio: React.FC<{ e: Espacio; vertical: boolean }> = ({ e, vertical }) => {
  const frame = useCurrentFrame();
  const total = ESCENA + T;
  const deriva = interpolate(frame, [0, total], [1.04, 1.12]);
  const estilo: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    filter: "contrast(1.08) saturate(1.18) brightness(1.03)",
    transform: `scale(${deriva * pulso(frame)})`,
  };
  const video = vertical ? e.video : e.videoHorizontal ?? e.video;
  if (video) {
    return (
      <OffthreadVideo
        src={staticFile(`clips/${video}`)}
        startFrom={Math.round((e.desde ?? 0) * 30)}
        playbackRate={0.6}
        muted
        style={estilo}
      />
    );
  }
  const x = vertical && e.paneo ? interpolate(frame, [0, total], e.paneo === "der" ? [12, 88] : [88, 12]) : 50;
  return <Img src={staticFile(`fotos/${e.foto}`)} style={{ ...estilo, objectPosition: `${x}% 50%` }} />;
};

// Envuelve una escena con su entrada (transición) y su salida.
const Entrada: React.FC<{ tipo: Transicion; children: React.ReactNode }> = ({ tipo, children }) => {
  const frame = useCurrentFrame();
  const p = Math.min(1, frame / T); // 0→1 durante la transición
  const suave = 1 - Math.pow(1 - p, 3);
  let transform = "none";
  let filter = "none";
  let rgb = 0;
  if (frame < T) {
    if (tipo === "whip") {
      transform = `translateX(${(1 - suave) * 100}%)`;
      filter = `blur(${(1 - suave) * 28}px)`;
    } else if (tipo === "whipArriba") {
      transform = `translateY(${(1 - suave) * 100}%)`;
      filter = `blur(${(1 - suave) * 28}px)`;
    } else if (tipo === "zoom") {
      transform = `scale(${1 + (1 - suave) * 0.9})`;
      filter = `blur(${(1 - suave) * 22}px) brightness(${1 + (1 - suave) * 0.8})`;
    } else {
      rgb = (1 - p) * 40;
      transform = `translateX(${(random(`gx${frame}`) - 0.5) * 80 * (1 - p)}px)`;
    }
  }
  return (
    <AbsoluteFill style={{ transform, filter, opacity: tipo === "glitch" && frame < 2 ? 0.6 : 1 }}>
      {children}
      {rgb > 0 && (
        <>
          <AbsoluteFill
            style={{ mixBlendMode: "screen", transform: `translateX(${rgb}px)`, opacity: 0.5, filter: "grayscale(1) sepia(1) saturate(9) hue-rotate(-40deg)" }}
          >
            {children}
          </AbsoluteFill>
          <AbsoluteFill
            style={{ mixBlendMode: "screen", transform: `translateX(${-rgb}px)`, opacity: 0.5, filter: "grayscale(1) sepia(1) saturate(9) hue-rotate(140deg)" }}
          >
            {children}
          </AbsoluteFill>
          {[0, 1, 2, 3].map((k) => {
            const y = random(`fy${frame}-${k}`) * 90;
            const h = 3 + random(`fh${frame}-${k}`) * 8;
            const dx = (random(`fx${frame}-${k}`) - 0.5) * 140 * (1 - p);
            return (
              <AbsoluteFill
                key={k}
                style={{
                  clipPath: `inset(${y}% 0 ${Math.max(0, 100 - y - h)}% 0)`,
                  transform: `translateX(${dx}px)`,
                  filter: "contrast(1.3) saturate(1.6)",
                }}
              >
                {children}
              </AbsoluteFill>
            );
          })}
        </>
      )}
    </AbsoluteFill>
  );
};

// Texto que sube desde una máscara, palabra por palabra.
const Revela: React.FC<{ texto: string; desde: number; estilo: React.CSSProperties; paso?: number }> = ({
  texto,
  desde,
  estilo,
  paso = 3,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: "0.25em", ...estilo }}>
      {texto.split(" ").map((w, i) => {
        const s = spring({ frame: frame - desde - i * paso, fps, config: { damping: 16, stiffness: 160 } });
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.08em" }}>
            <span style={{ display: "inline-block", transform: `translateY(${(1 - s) * 110}%)` }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

const Placa: React.FC<{ e: Espacio; numero: number; total: number; tipo: Transicion }> = ({ e, numero, total, tipo }) => {
  const frame = useCurrentFrame();
  const vertical = useVertical();
  const linea = interpolate(frame, [T, T + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Entrada tipo={tipo}>
      <AbsoluteFill style={{ backgroundColor: ALDEA.verdeOscuro, overflow: "hidden" }}>
        <Medio e={e} vertical={vertical} />
        <AbsoluteFill
          style={{
            background: vertical
              ? "linear-gradient(180deg, rgba(20,34,26,0.25) 0%, rgba(20,34,26,0) 30%, rgba(20,34,26,0) 50%, rgba(20,34,26,0.6) 70%, rgba(20,34,26,0.95) 100%)"
              : "linear-gradient(90deg, rgba(20,34,26,0.92) 0%, rgba(20,34,26,0.55) 38%, rgba(20,34,26,0) 62%)",
          }}
        />
        <AbsoluteFill
          style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: vertical ? "0 80px 330px" : "0 110px 120px" }}
        >
          <Revela
            texto={`${String(numero).padStart(2, "0")} — ${String(total).padStart(2, "0")}`}
            desde={T}
            estilo={{ fontFamily: SANS, fontWeight: 700, fontSize: vertical ? 34 : 28, letterSpacing: "0.2em", color: ALDEA.amarillo }}
          />
          <div style={{ width: (vertical ? 140 : 110) * linea, height: 6, backgroundColor: ALDEA.amarillo, margin: "16px 0 20px" }} />
          <Revela
            texto={e.nombre}
            desde={T + 2}
            paso={4}
            estilo={{ fontFamily: SERIF, fontSize: vertical ? 150 : 128, lineHeight: 0.95, color: ALDEA.crema, maxWidth: vertical ? 940 : 860 }}
          />
          <Revela
            texto={e.descripcion}
            desde={T + 2 * TIEMPO}
            paso={1}
            estilo={{ fontFamily: SANS, fontWeight: 500, fontSize: vertical ? 42 : 36, lineHeight: 1.3, color: ALDEA.crema, marginTop: 22, maxWidth: vertical ? 900 : 720 }}
          />
        </AbsoluteFill>
      </AbsoluteFill>
    </Entrada>
  );
};

// Intro: logo y palabras que caen sobre los tiempos mientras la música sube.
const Intro: React.FC<{ g: GuionEspacios }> = ({ g }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = useVertical();
  const video = vertical ? g.intro.video : g.intro.videoHorizontal ?? g.intro.video;
  const golpe = (n: number) => spring({ frame: frame - n * TIEMPO, fps, config: { damping: 11, stiffness: 180 } });
  const palabras2 = g.intro.linea2.split(" ");
  const tension = interpolate(frame, [4 * TIEMPO, 8 * TIEMPO], [1, 1.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: ALDEA.verde, overflow: "hidden" }}>
      {video && (
        <AbsoluteFill style={{ opacity: 0.5, transform: `scale(${tension})` }}>
          <OffthreadVideo src={staticFile(`clips/${video}`)} muted playbackRate={0.7} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ backgroundColor: "rgba(28,46,35,0.6)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: vertical ? 34 : 20, textAlign: "center", transform: `scale(${tension})` }}>
        <div style={{ transform: `scale(${golpe(0)}) rotate(${(1 - golpe(0)) * -15}deg)` }}>
          <Logo size={vertical ? 230 : 190} />
        </div>
        <div style={{ fontFamily: SERIF, fontSize: vertical ? 156 : 140, lineHeight: 1, color: ALDEA.crema, display: "flex", gap: "0.22em" }}>
          {g.intro.linea1.split(" ").map((w, i) => (
            <span key={i} style={{ display: "inline-block", opacity: golpe(1 + i * 0.5), transform: `translateY(${(1 - golpe(1 + i * 0.5)) * 60}px)` }}>
              {w}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5em", fontFamily: SANS, fontWeight: 800, fontSize: vertical ? 42 : 36, letterSpacing: "0.22em", textTransform: "uppercase", color: ALDEA.amarillo }}>
          {palabras2.map((w, i) => (
            <span key={i} style={{ display: "inline-block", opacity: golpe(4 + i), transform: `scale(${0.6 + 0.4 * golpe(4 + i)})` }}>
              {w}
            </span>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Cierre: React.FC<{ g: GuionEspacios }> = ({ g }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = useVertical();
  const golpe = (n: number) => spring({ frame: frame - T - n * TIEMPO, fps, config: { damping: 12, stiffness: 170 } });
  const it = (n: number): React.CSSProperties => ({ opacity: golpe(n), transform: `translateY(${(1 - golpe(n)) * 40}px) scale(${0.85 + 0.15 * golpe(n)})` });
  return (
    <Entrada tipo="zoom">
      <AbsoluteFill style={{ backgroundColor: ALDEA.verde, justifyContent: "center", alignItems: "center", textAlign: "center", gap: vertical ? 34 : 22, padding: 80 }}>
        <div style={{ ...it(0), transform: `${it(0).transform} scale(${pulso(frame, 0.04)})` }}>
          <Logo size={vertical ? 190 : 150} />
        </div>
        <Revela
          texto={g.cierre.llamado}
          desde={T + TIEMPO}
          paso={3}
          estilo={{ fontFamily: SERIF, fontSize: vertical ? 124 : 112, lineHeight: 1, color: ALDEA.crema, justifyContent: "center", maxWidth: vertical ? 900 : 1300 }}
        />
        <div
          style={{
            ...it(3),
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: vertical ? 48 : 40,
            letterSpacing: "0.06em",
            backgroundColor: ALDEA.amarillo,
            color: ALDEA.verde,
            padding: vertical ? "22px 46px" : "18px 40px",
            borderRadius: 999,
            boxShadow: `0 0 ${30 + 30 * Math.exp(-((frame - T) % TIEMPO) / 4)}px rgba(242,202,17,0.45)`,
          }}
        >
          WhatsApp {g.cierre.whatsapp}
        </div>
        <div style={{ ...it(5), fontFamily: SANS, fontWeight: 500, fontSize: vertical ? 36 : 30, color: ALDEA.crema, lineHeight: 1.45 }}>
          {g.cierre.direccion}
          <br />
          <span style={{ color: ALDEA.amarillo, fontWeight: 700 }}>{g.cierre.usuario}</span>
        </div>
      </AbsoluteFill>
    </Entrada>
  );
};

const Flash: React.FC<{ en: number; largo?: number; fuerza?: number }> = ({ en, largo = 6, fuerza = 0.85 }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [en, en + 1, en + largo], [0, fuerza, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return op > 0 ? <AbsoluteFill style={{ backgroundColor: "#FFF8E6", opacity: op }} /> : null;
};

export const EspaciosPro: React.FC<GuionEspacios> = (g) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const n = g.espacios.length;
  const inicioCierre = ESCENA * (1 + n);
  const musica = g.musica === undefined ? "house-aldea.mp3" : g.musica;

  // ¿Estamos en una transición? → destello de luz
  const enTrans = (k: number) => (frame - k * ESCENA) / T;
  let destello: React.ReactNode = null;
  for (let k = 1; k <= n + 1; k++) {
    const p = enTrans(k);
    if (p >= -0.3 && p <= 1.3) destello = <Destello progreso={(p + 0.3) / 1.6} lado={k % 2 ? 1 : -1} />;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: ALDEA.verdeOscuro }}>
      <Sequence durationInFrames={ESCENA + T}>
        <Intro g={g} />
      </Sequence>
      {g.espacios.map((e, i) => {
        const tipo = CICLO[i % CICLO.length];
        return (
          <Sequence key={i} from={ESCENA * (i + 1)} durationInFrames={ESCENA + T}>
            <Placa e={e} numero={i + 1} total={n} tipo={tipo} />
          </Sequence>
        );
      })}
      <Sequence from={inicioCierre}>
        <Cierre g={g} />
      </Sequence>

      {destello}
      <Flash en={ESCENA} largo={8} fuerza={0.95} />
      <Flash en={inicioCierre} largo={7} fuerza={0.8} />
      <Grano />

      {/* ---------- Sonido ---------- */}
      {musica && (
        <Audio
          src={staticFile(`musica/${musica}`)}
          volume={(f) =>
            (g.volumenMusica ?? 0.85) *
            interpolate(f, [durationInFrames - 40, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          }
        />
      )}
      <Sequence from={ESCENA}>
        <Audio src={staticFile("sonidos/boom.mp3")} volume={0.9} />
      </Sequence>
      {g.espacios.map((e, i) => {
        const tipo = CICLO[i % CICLO.length];
        const k = ESCENA * (i + 1);
        return (
          <React.Fragment key={`s${i}`}>
            {i > 0 && (
              <Sequence from={k - 4}>
                <Audio src={staticFile(tipo === "glitch" ? "sonidos/glitch.mp3" : "sonidos/whip.mp3")} volume={0.55} />
              </Sequence>
            )}
            {e.foto && (
              <Sequence from={k + T}>
                <Audio src={staticFile("sonidos/shutter.mp3")} volume={0.3} />
              </Sequence>
            )}
          </React.Fragment>
        );
      })}
      <Sequence from={inicioCierre - 4}>
        <Audio src={staticFile("sonidos/whip.mp3")} volume={0.55} />
      </Sequence>
      <Sequence from={inicioCierre}>
        <Audio src={staticFile("sonidos/boom.mp3")} volume={0.75} />
      </Sequence>
      {!musica && (
        <Sequence from={ESCENA - 48}>
          <Audio src={staticFile("sonidos/riser.mp3")} volume={0.5} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
