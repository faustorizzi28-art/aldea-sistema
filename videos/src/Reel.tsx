import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FPS, MARCA } from "./marca";

// ---------------------------------------------------------------------------
// EL GUION: esto es lo único que hay que escribir para hacer un video nuevo.
// Claude lo arma en un archivo de guiones/*.json siguiendo la filosofía de marca.
// ---------------------------------------------------------------------------
export type Escena = {
  texto: string; // lo que se lee en pantalla (corto: 3 a 12 palabras)
  foto?: string; // nombre de archivo dentro de public/fotos (opcional)
  segundos?: number; // cuánto dura la escena (por defecto 3)
  tipo?: "gancho" | "normal" | "cierre"; // cambia el estilo visual
  destacar?: string; // palabra que se pinta en amarillo
};

export type Guion = {
  titulo: string;
  escenas: Escena[];
};

export const segundosDeEscena = (e: Escena) => e.segundos ?? 3;

export const duracionTotal = (guion: Guion) =>
  Math.round(guion.escenas.reduce((t, e) => t + segundosDeEscena(e), 0) * FPS);

// Foto de fondo con zoom lento ("efecto Ken Burns") y oscurecido para leer el texto.
const FondoFoto: React.FC<{ foto?: string; tipo: Escena["tipo"] }> = ({ foto, tipo }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.12]);

  if (!foto) {
    return (
      <AbsoluteFill
        style={{ backgroundColor: tipo === "cierre" ? MARCA.rojo : MARCA.negro }}
      />
    );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: MARCA.negro }}>
      <Img
        src={staticFile(`fotos/${foto}`)}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.85) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// Texto que aparece palabra por palabra, con un pequeño rebote.
const TextoAnimado: React.FC<{ escena: Escena }> = ({ escena }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const palabras = escena.texto.split(" ");
  const grande = escena.tipo === "gancho" || escena.tipo === "cierre";

  // Al final de cada escena el texto se desvanece.
  const salida = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: escena.tipo === "normal" || !escena.tipo ? "flex-end" : "center",
        alignItems: "center",
        padding: "0 80px 320px",
        paddingBottom: escena.tipo === "normal" || !escena.tipo ? 320 : 0,
        opacity: salida,
      }}
    >
      <div
        style={{
          fontFamily: MARCA.tipografia,
          fontSize: grande ? 104 : 76,
          fontWeight: 900,
          lineHeight: 1.12,
          color: MARCA.blanco,
          textAlign: "center",
          textShadow: "0 6px 24px rgba(0,0,0,0.6)",
          textTransform: escena.tipo === "gancho" ? "uppercase" : "none",
        }}
      >
        {palabras.map((palabra, i) => {
          const entrada = spring({ frame: frame - i * 3, fps, config: { damping: 12 } });
          const limpia = palabra.replace(/[.,!?¿¡:;]/g, "").toLowerCase();
          const resaltada =
            escena.destacar && limpia === escena.destacar.toLowerCase();
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                marginRight: "0.28em",
                opacity: entrada,
                transform: `translateY(${(1 - entrada) * 60}px)`,
                color: resaltada ? MARCA.amarillo : undefined,
              }}
            >
              {palabra}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Barra de progreso arriba (retiene a la gente hasta el final).
const BarraProgreso: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: 14,
        width: `${(frame / durationInFrames) * 100}%`,
        backgroundColor: MARCA.amarillo,
      }}
    />
  );
};

const Firma: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 110,
      width: "100%",
      textAlign: "center",
      fontFamily: MARCA.tipografia,
      fontSize: 40,
      fontWeight: 700,
      color: MARCA.blanco,
      opacity: 0.85,
    }}
  >
    {MARCA.usuario}
  </div>
);

// El video completo: pone una escena detrás de la otra.
export const Reel: React.FC<Guion> = (guion) => {
  let desde = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: MARCA.negro }}>
      {guion.escenas.map((escena, i) => {
        const dura = Math.round(segundosDeEscena(escena) * FPS);
        const inicio = desde;
        desde += dura;
        return (
          <Sequence key={i} from={inicio} durationInFrames={dura}>
            <FondoFoto foto={escena.foto} tipo={escena.tipo} />
            <TextoAnimado escena={escena} />
          </Sequence>
        );
      })}
      <BarraProgreso />
      <Firma />
    </AbsoluteFill>
  );
};
