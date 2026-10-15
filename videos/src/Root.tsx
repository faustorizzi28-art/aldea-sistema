import React from "react";
import { Composition } from "remotion";
import { Reel, Guion, duracionTotal } from "./Reel";
import { ALTO, ANCHO, FPS } from "./marca";
import ejemplo from "../guiones/ejemplo-karate.json";
import { GuionHablado, VideoHablado, duracionHablado } from "./VideoHablado";
import hablado from "../guiones/hablado-2026-10-12.json";
import { Espacios, GuionEspacios, duracionEspacios } from "./Espacios";
import espacios from "../guiones/aldea-espacios.json";
import { EspaciosPro, duracionEspaciosPro } from "./EspaciosPro";

// Acá se "registran" los videos. Cada <Composition> aparece en el Estudio.
export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Composition
      id="Reel"
      component={Reel}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={duracionTotal(ejemplo as Guion)}
      defaultProps={ejemplo as Guion}
      // Si le pasamos otro guion (--props=guiones/otro.json), la duración se recalcula sola.
      calculateMetadata={({ props }) => ({ durationInFrames: duracionTotal(props) })}
    />
    {/* Para videos grabados hablando a cámara */}
    <Composition
      id="VideoHablado"
      component={VideoHablado}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={duracionHablado(hablado as GuionHablado)}
      defaultProps={hablado as GuionHablado}
      calculateMetadata={({ props }) => ({ durationInFrames: duracionHablado(props) })}
    />
    {/* Presentación de espacios de un lugar: vertical y horizontal */}
    <Composition
      id="Espacios"
      component={Espacios}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={duracionEspacios(espacios as GuionEspacios)}
      defaultProps={espacios as GuionEspacios}
      calculateMetadata={({ props }) => ({ durationInFrames: duracionEspacios(props) })}
    />
    <Composition
      id="EspaciosHorizontal"
      component={Espacios}
      width={ALTO}
      height={ANCHO}
      fps={FPS}
      durationInFrames={duracionEspacios(espacios as GuionEspacios)}
      defaultProps={espacios as GuionEspacios}
      calculateMetadata={({ props }) => ({ durationInFrames: duracionEspacios(props) })}
    />
    {/* Misma presentación con edición de tendencia: cortes al ritmo, drop, glitch, grano */}
    <Composition
      id="EspaciosPro"
      component={EspaciosPro}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={duracionEspaciosPro(espacios as GuionEspacios)}
      defaultProps={espacios as GuionEspacios}
      calculateMetadata={({ props }) => ({ durationInFrames: duracionEspaciosPro(props) })}
    />
    <Composition
      id="EspaciosProHorizontal"
      component={EspaciosPro}
      width={ALTO}
      height={ANCHO}
      fps={FPS}
      durationInFrames={duracionEspaciosPro(espacios as GuionEspacios)}
      defaultProps={espacios as GuionEspacios}
      calculateMetadata={({ props }) => ({ durationInFrames: duracionEspaciosPro(props) })}
    />
    </>
  );
};
