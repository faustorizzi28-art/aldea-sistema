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
import { TransitionPresentation, TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { FPS, MARCA } from "./marca";

// ---------------------------------------------------------------------------
// EL GUION: esto es lo único que hay que escribir para hacer un video nuevo.
// Claude lo arma en un archivo de guiones/*.json siguiendo la filosofía de marca.
// ---------------------------------------------------------------------------
export type Escena = {
  texto: string; // lo que se lee en pantalla (corto: 3 a 12 palabras)
  foto?: string; // nombre de archivo dentro de public/fotos (opcional)
  video?: string; // o un clip dentro de public/clips (vertical 1080x1920)
  desde?: number; // segundo del clip donde arranca la escena (por defecto 0)
  paneo?: "izq" | "der"; // fotos horizontales: la "cámara" recorre la foto hacia ese lado
  segundos?: number; // cuánto dura la escena (por defecto 3)
  tipo?: "gancho" | "normal" | "cierre"; // cambia el estilo visual
  destacar?: string; // palabra que se pinta en amarillo
  // Cómo ENTRA esta escena (se ignora en la primera). Por defecto: "deslizar".
  transicion?: "corte" | "deslizar" | "barrido" | "fundido";
  // Efecto visual al arrancar la escena. El gancho trae "temblor" por defecto.
  efecto?: "temblor" | "flash" | "zoom" | "ninguno";
};

export type Guion = {
  titulo: string;
  escenas: Escena[];
  musica?: string | null; // archivo en public/musica. null = sin música
  volumenMusica?: number; // 0 a 1 (por defecto 0.35, para que no tape la voz)
  sonidos?: boolean; // efectos de sonido (whoosh, impacto, pop). Por defecto sí
  voz?: string; // voz en off opcional: archivo en public/voz (grabado con el celu)
  // Para videos de OTRA cuenta (ej. Aldea de Valle): cambia colores y usuario.
  estilo?: { fondoCierre?: string; acento?: string; usuario?: string };
};

type Estilo = { fondoCierre: string; acento: string; usuario: string };
const EstiloCtx = React.createContext<Estilo>({
  fondoCierre: MARCA.rojo,
  acento: MARCA.amarillo,
  usuario: MARCA.usuario,
});

export const segundosDeEscena = (e: Escena) => e.segundos ?? 3;

// Las transiciones superponen dos escenas, así que el video dura un poco menos que la suma.
const CUADROS_TRANSICION = 12;
const tieneTransicion = (e: Escena, i: number) => i > 0 && (e.transicion ?? "deslizar") !== "corte";

export const duracionTotal = (guion: Guion) => {
  const escenas = guion.escenas.reduce((t, e) => t + Math.round(segundosDeEscena(e) * FPS), 0);
  const solapes = guion.escenas.filter(tieneTransicion).length * CUADROS_TRANSICION;
  return escenas - solapes;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const presentacion = (tipo: Escena["transicion"]): TransitionPresentation<any> => {
  switch (tipo) {
    case "barrido":
      return wipe({ direction: "from-left" });
    case "fundido":
      return fade();
    default:
      return slide({ direction: "from-right" });
  }
};

// Foto de fondo con zoom lento ("efecto Ken Burns") y oscurecido para leer el texto.
const FondoFoto: React.FC<{
  foto?: string;
  video?: string;
  desde?: number;
  paneo?: Escena["paneo"];
  tipo: Escena["tipo"];
}> = ({ foto, video, desde, paneo, tipo }) => {
  const estilo = React.useContext(EstiloCtx);
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.12]);

  if (video) {
    return (
      <AbsoluteFill style={{ backgroundColor: MARCA.negro }}>
        <OffthreadVideo
          src={staticFile(`clips/${video}`)}
          startFrom={Math.round((desde ?? 0) * FPS)}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1 + (zoom - 1) * 0.5})` }}
        />
        <AbsoluteFill
          style={{
            background:
              tipo === "cierre"
                ? "rgba(0,0,0,0.55)"
                : "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.8) 100%)",
          }}
        />
      </AbsoluteFill>
    );
  }
  if (!foto) {
    return (
      <AbsoluteFill
        style={{ backgroundColor: tipo === "cierre" ? estilo.fondoCierre : MARCA.negro }}
      />
    );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: MARCA.negro }}>
      <Img
        src={staticFile(`fotos/${foto}`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: paneo
            ? `${interpolate(frame, [0, durationInFrames], paneo === "der" ? [15, 85] : [85, 15])}% 50%`
            : "50% 50%",
          transform: `scale(${paneo ? 1 + (zoom - 1) * 0.4 : zoom})`,
        }}
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
  const estilo = React.useContext(EstiloCtx);
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
                color: resaltada ? estilo.acento : undefined,
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

// Efectos visuales al arrancar la escena: temblor (golpe), flash (destello) o zoom (acercamiento brusco).
const EfectoEntrada: React.FC<{ efecto: Escena["efecto"]; children: React.ReactNode }> = ({ efecto, children }) => {
  const frame = useCurrentFrame();
  let transform = "none";
  if (efecto === "temblor" && frame < 14) {
    const fuerza = (14 - frame) * 2.2;
    transform = `translate(${Math.sin(frame * 2.7) * fuerza}px, ${Math.cos(frame * 3.3) * fuerza}px)`;
  }
  if (efecto === "zoom") {
    transform = `scale(${interpolate(frame, [0, 8], [1.35, 1], { extrapolateRight: "clamp" })})`;
  }
  const flash = efecto === "flash" ? interpolate(frame, [0, 7], [0.9, 0], { extrapolateRight: "clamp" }) : 0;
  return (
    <AbsoluteFill style={{ transform }}>
      {children}
      {flash > 0 && <AbsoluteFill style={{ backgroundColor: MARCA.blanco, opacity: flash }} />}
    </AbsoluteFill>
  );
};

// Sonidos de cada escena: whoosh en la transición, impacto en gancho/cierre, pop en la palabra destacada.
const SonidosEscena: React.FC<{ escena: Escena; indice: number }> = ({ escena, indice }) => {
  const palabras = escena.texto.split(" ");
  const posDestacada = escena.destacar
    ? palabras.findIndex((p) => p.replace(/[.,!?¿¡:;]/g, "").toLowerCase() === escena.destacar!.toLowerCase())
    : -1;
  const fuerte = escena.tipo === "gancho" || escena.tipo === "cierre";
  return (
    <>
      {tieneTransicion(escena, indice) && <Audio src={staticFile("sonidos/whoosh.mp3")} volume={0.5} />}
      {fuerte && (
        <Sequence from={indice === 0 ? 0 : CUADROS_TRANSICION}>
          <Audio src={staticFile("sonidos/impacto.mp3")} volume={0.8} />
        </Sequence>
      )}
      {posDestacada >= 0 && (
        <Sequence from={posDestacada * 3 + (indice === 0 ? 0 : CUADROS_TRANSICION)}>
          <Audio src={staticFile("sonidos/pop.mp3")} volume={0.45} />
        </Sequence>
      )}
    </>
  );
};

// Música de fondo: entra suave y se apaga al final.
const Musica: React.FC<{ archivo: string; volumen: number }> = ({ archivo, volumen }) => {
  const { durationInFrames } = useVideoConfig();
  return (
    <Audio
      src={staticFile(`musica/${archivo}`)}
      loop
      volume={(f) =>
        volumen *
        interpolate(f, [0, 15, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  );
};

// Barra de progreso arriba (retiene a la gente hasta el final).
const BarraProgreso: React.FC = () => {
  const estilo = React.useContext(EstiloCtx);
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
        backgroundColor: estilo.acento,
      }}
    />
  );
};

const Firma: React.FC = () => {
  const estilo = React.useContext(EstiloCtx);
  return (
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
    {estilo.usuario}
  </div>
  );
};

// El video completo: pone una escena detrás de la otra, con transiciones, música y efectos.
export const Reel: React.FC<Guion> = (guion) => {
  const musica = guion.musica === undefined ? "ritmo-entreno.mp3" : guion.musica;
  const conSonidos = guion.sonidos ?? true;
  const estilo: Estilo = {
    fondoCierre: guion.estilo?.fondoCierre ?? MARCA.rojo,
    acento: guion.estilo?.acento ?? MARCA.amarillo,
    usuario: guion.estilo?.usuario ?? MARCA.usuario,
  };
  return (
    <EstiloCtx.Provider value={estilo}>
    <AbsoluteFill style={{ backgroundColor: MARCA.negro }}>
      <TransitionSeries>
        {guion.escenas.flatMap((escena, i) => {
          const efecto = escena.efecto ?? (escena.tipo === "gancho" ? "temblor" : "ninguno");
          const piezas = [];
          if (tieneTransicion(escena, i)) {
            piezas.push(
              <TransitionSeries.Transition
                key={`t${i}`}
                presentation={presentacion(escena.transicion)}
                timing={linearTiming({ durationInFrames: CUADROS_TRANSICION })}
              />,
            );
          }
          piezas.push(
            <TransitionSeries.Sequence key={`e${i}`} durationInFrames={Math.round(segundosDeEscena(escena) * FPS)}>
              <EfectoEntrada efecto={efecto}>
                <FondoFoto foto={escena.foto} video={escena.video} desde={escena.desde} paneo={escena.paneo} tipo={escena.tipo} />
                <TextoAnimado escena={escena} />
              </EfectoEntrada>
              {conSonidos && <SonidosEscena escena={escena} indice={i} />}
            </TransitionSeries.Sequence>,
          );
          return piezas;
        })}
      </TransitionSeries>
      {musica && <Musica archivo={musica} volumen={guion.volumenMusica ?? 0.35} />}
      {guion.voz && <Audio src={staticFile(`voz/${guion.voz}`)} />}
      <BarraProgreso />
      <Firma />
    </AbsoluteFill>
    </EstiloCtx.Provider>
  );
};
