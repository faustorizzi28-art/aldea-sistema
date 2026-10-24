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
import { HabladoPro, GuionHabladoPro, duracionHabladoPro } from "./HabladoPro";
import habladoPro from "../guiones/hablado-pro-2026-10-12.json";
import { HabladoSuave, duracionHabladoSuave } from "./HabladoSuave";
import suave from "../guiones/suave-mananas-noches.json";
import { Historia, GuionHistoria, duracionHistoria } from "./Historia";
import historia from "../guiones/historia-lunes-2026-10-19.json";
import glorin from "../guiones/glorin-reel-cumples.json";
import aldeaPileta from "../guiones/historia-aldea-pileta.json";
import aldeaEventos from "../guiones/historia-aldea-eventos.json";
import bunkaiCeremonia from "../guiones/bunkai-ceremonia.json";
import bunkaiHomenaje from "../guiones/bunkai-ceremonia-homenaje.json";
import { Teaser, GuionTeaser, duracionTeaser } from "./Teaser";
import teaserDewey from "../guiones/teaser-colonia-dewey.json";
import { PortadaDewey, PortadaAldeaVerano } from "./Portada";
import teaserAldea from "../guiones/teaser-aldea-verano.json";

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
    {/* Estilo de los reels de Aldea: persona hablando + subtítulos palabra por palabra + destacados + b-roll */}
    <Composition
      id="HabladoPro"
      component={HabladoPro}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={duracionHabladoPro(habladoPro as GuionHabladoPro)}
      defaultProps={habladoPro as GuionHabladoPro}
      calculateMetadata={({ props }) => ({ durationInFrames: duracionHabladoPro(props) })}
    />
    {/* Versión "pro" del estilo hablado: fundidos, sin efectos ruidosos, subtítulos tranquilos */}
    <Composition
      id="HabladoSuave"
      component={HabladoSuave}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={duracionHabladoSuave(suave as GuionHabladoPro)}
      defaultProps={suave as GuionHabladoPro}
      calculateMetadata={({ props }) => ({ durationInFrames: duracionHabladoSuave(props) })}
    />
    {/* Historias cortas (10–15 s) con tomas que se funden y placa final */}
    <Composition
      id="Historia"
      component={Historia}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={duracionHistoria(historia as GuionHistoria)}
      defaultProps={historia as GuionHistoria}
      calculateMetadata={({ props }) => ({ durationInFrames: duracionHistoria(props) })}
    />
    <Composition
      id="GlorinReel"
      component={Historia}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={duracionHistoria(glorin as GuionHistoria)}
      defaultProps={glorin as GuionHistoria}
      calculateMetadata={({ props }) => ({ durationInFrames: duracionHistoria(props) })}
    />
    <Composition
      id="AldeaHistoria"
      component={Historia}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={duracionHistoria(aldeaPileta as GuionHistoria)}
      defaultProps={aldeaPileta as GuionHistoria}
      calculateMetadata={({ props }) => ({ durationInFrames: duracionHistoria(props) })}
    />
    <Composition
      id="AldeaEventos"
      component={Historia}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={duracionHistoria(aldeaEventos as GuionHistoria)}
      defaultProps={aldeaEventos as GuionHistoria}
      calculateMetadata={({ props }) => ({ durationInFrames: duracionHistoria(props) })}
    />
    <Composition
      id="BunkaiCeremonia"
      component={Historia}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={duracionHistoria(bunkaiCeremonia as GuionHistoria)}
      defaultProps={bunkaiCeremonia as GuionHistoria}
      calculateMetadata={({ props }) => ({ durationInFrames: duracionHistoria(props) })}
    />
    <Composition
      id="BunkaiHomenaje"
      component={Historia}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={duracionHistoria(bunkaiHomenaje as GuionHistoria)}
      defaultProps={bunkaiHomenaje as GuionHistoria}
      calculateMetadata={({ props }) => ({ durationInFrames: duracionHistoria(props) })}
    />
    <Composition
      id="Teaser"
      component={Teaser}
      width={ANCHO}
      height={ALTO}
      fps={FPS}
      durationInFrames={duracionTeaser(teaserDewey as GuionTeaser)}
      defaultProps={teaserDewey as GuionTeaser}
      calculateMetadata={({ props }) => ({ durationInFrames: duracionTeaser(props) })}
    />
    <Composition id="PortadaDewey" component={PortadaDewey} width={ANCHO} height={ALTO} fps={FPS} durationInFrames={1} />
    <Composition id="PortadaAldeaVerano" component={PortadaAldeaVerano} width={ANCHO} height={ALTO} fps={FPS} durationInFrames={1} />
    <Composition id="TeaserAldea" component={Teaser} width={ANCHO} height={ALTO} fps={FPS} durationInFrames={duracionTeaser(teaserAldea as GuionTeaser)} defaultProps={teaserAldea as GuionTeaser} />
    </>
  );
};
