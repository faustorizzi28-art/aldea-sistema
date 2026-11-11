#!/bin/bash
# Reel GLORIN "Ni un minuto quietos" (cumple de Olivia) según el manual de edición.
set -e
U=/root/.claude/uploads/c483a6ea-cf98-5620-afbc-5cfee2addf2c
TM="zscale=t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,"
G="eq=contrast=1.08:saturation=1.22,colorbalance=rs=0.03:bs=-0.02"
# seg <salida> <archivo> <desde> <dur_salida> <velocidad> <pre> <punch> <shake> <texto.png|-> <texto_desde> <extra_fin>
seg(){
  local o=$1 f=$2 ss=$3 d=$4 sp=$5 pre=$6 P=$7 S=$8 t=$9 ts=${10} ex=${11}
  local src_d=$(echo "$d*$sp+0.1"|bc|sed "s/^\./0./")
  local tm="$TM"; [[ $f == *.mp4 ]] && tm=""
  local txt="" ; [ "$t" != "-" ] && txt="[1:v]format=rgba,fade=t=in:st=$ts:d=0.12:alpha=1[o];[v0][o]overlay=0:'if(lt(t-$ts,0.15),40*(1-(t-$ts)/0.15),0)'[v1]" || txt="[v0]null[v1]"
  ffmpeg -y -v error -ss $ss -t $src_d -i "$f" -loop 1 -t $d -i ${t/-/promesa.png} -filter_complex "\
[0:v]scale=-2:1920,${tm}${pre}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setpts=PTS/$sp,fps=30,setsar=1,$G,\
scale=w='trunc(1080*(1.08+$P*exp(-t*9))/2)*2':h=-2:eval=frame,\
crop=1080:1920:x='(iw-1080)/2+if(lt(t,0.35),$S*sin(t*95),0)':y='(ih-1920)/2+if(lt(t,0.35),$S*cos(t*81),0)'$ex[v0];$txt;[v1]format=yuv420p,setsar=1[out]" \
  -map "[out]" -map 0:a -af "aresample=48000,atempo=$sp,volume=0.55,afade=t=in:d=0.04,afade=t=out:st=$(echo "$d-0.05"|bc|sed "s/^\./0./"):d=0.05" -ac 2 -t $d -c:v libx264 -crf 17 -c:a aac -b:a 192k $o
}
R=",fade=t=in:d=0.12:color=0xC8161A"
seg s01.mp4 $U/e3661d86-IMG_4701.mov 4.0 2.0 1.0 "hflip,vflip," 0.18 28 gancho.png 0.05 ""
seg s02.mp4 $U/86a8e6b3-IMG_4698.mov 2.4 3.0 1.1 "" 0.0 0 promesa.png 0.1 "$R"
# la mano: acercamiento que se acelera hasta taparlo todo
ffmpeg -y -v error -ss 7.6 -t 0.75 -i $U/86a8e6b3-IMG_4698.mov -filter_complex "[0:v]scale=-2:1920,${TM}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setpts=PTS/1.4,fps=30,setsar=1,$G,scale=w='trunc(1080*(1.08+1.2*pow(t/0.5,2))/2)*2':h=-2:eval=frame,crop=1080:1920,format=yuv420p[v]" -map "[v]" -map 0:a -af "aresample=48000,atempo=1.4,volume=0.55" -ac 2 -t 0.5 -c:v libx264 -crf 17 -c:a aac -b:a 192k s03.mp4
seg s04.mp4 $U/e3661d86-IMG_4701.mov 1.6 1.0 1.0 "hflip,vflip," 0.15 22 inflable.png 0.05 "$R"
seg s05.mp4 $U/8e6f115b-IMG_4702.mov 1.6 1.5 1.0 "hflip,vflip," 0.12 0 carita.png 0.05 ""
seg s06.mp4 $U/90e15e79-IMG_4713.mov 1.5 1.5 1.0 "" 0.12 0 profes.png 0.05 ""
seg s07.mp4 $U/82c63658-IMG_4708.mov 6.0 1.5 1.0 "" 0.12 0 bailan.png 0.05 ""
seg s08.mp4 $U/c8562d5f-IMG_4719.mov 0.3 1.0 1.0 "" 0.15 18 - 0 ""
seg s09.mp4 $U/218fba78-IMG_4703.mov 3.5 1.5 1.0 "" 0.12 0 show.png 0.05 ""
seg s10.mp4 $U/89cd8112-IMG_4722.mov 3.0 1.5 1.0 "" 0.12 0 pinata.png 0.05 ""
# freeze frame con "¿Quién juntó más?"
ffmpeg -y -v error -sseof -0.05 -i s10.mp4 -frames:v 1 -update 1 f.png && ffmpeg -y -v error -loop 1 -t 1.0 -i f.png -loop 1 -t 1.0 -i freeze.png -f lavfi -t 1.0 -i anullsrc=r=48000:cl=stereo -filter_complex "[0:v]fps=30,eq=saturation=0.6,scale=w='trunc(1080*(1.0+0.06*t)/2)*2':h=-2:eval=frame,crop=1080:1920,fade=t=in:d=0.06:color=white[a];[1:v]format=rgba[o];[a][o]overlay,format=yuv420p,setsar=1[v]" -map "[v]" -map 2:a -c:v libx264 -crf 17 -c:a aac s11.mp4
# MOMENTO WOW: la torta en cámara lenta, con el sonido real a velocidad normal
ffmpeg -y -v error -ss 0.4 -t 2.1 -i $U/1a0373fb-IMG_4717.mov -ss 0.2 -t 4.0 -i $U/1a0373fb-IMG_4717.mov -loop 1 -t 4.0 -i torta.png -filter_complex "[0:v]scale=-2:1920,${TM}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,$G,setpts=2*PTS,minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1,scale=w='trunc(1080*(1.04+0.06*t/4)/2)*2':h=-2:eval=frame,crop=1080:1920,fade=t=in:d=0.12:color=white[v0];[2:v]format=rgba,fade=t=in:st=0.4:d=0.2:alpha=1[o];[v0][o]overlay,format=yuv420p,setsar=1[v]" -map "[v]" -map 1:a -af "aresample=48000,volume=1.2,afade=t=out:st=3.8:d=0.2" -ac 2 -t 4.0 -c:v libx264 -crf 17 -c:a aac -b:a 192k s12.mp4
# testimonio de la familia
T=/home/user/aldea-sistema/videos/public/clips/glorin-testimonio.mp4
ffmpeg -y -v error -ss 3.0 -t 5.5 -i $T -loop 1 -t 5.5 -i tag.png -loop 1 -t 5.5 -i sub1.png -loop 1 -t 5.5 -i sub2.png -loop 1 -t 5.5 -i sub3.png -filter_complex "[0:v]scale=w='trunc(1080*(1.0+0.05*t/5.5)/2)*2':h=-2:eval=frame,crop=1080:1920,fade=t=in:d=0.12:color=0xC8161A[v];[1:v]format=rgba,fade=t=in:st=0.1:d=0.2:alpha=1[t];[2:v]format=rgba,fade=t=out:st=1.95:d=0.05:alpha=1[a];[3:v]format=rgba,fade=t=in:st=2.0:d=0.05:alpha=1,fade=t=out:st=3.55:d=0.05:alpha=1[b];[4:v]format=rgba,fade=t=in:st=3.6:d=0.05:alpha=1[c];[v][t]overlay[x];[x][a]overlay[y];[y][b]overlay[z];[z][c]overlay,format=yuv420p,setsar=1[out]" -map "[out]" -map 0:a -af "aresample=48000,volume=1.3,afade=t=out:st=5.4:d=0.1" -ac 2 -c:v libx264 -crf 17 -c:a aac -b:a 192k s13.mp4
seg s14.mp4 $U/aa146199-IMG_4724.mov 0.5 2.0 1.0 "" 0.0 0 chau.png 0.1 ",fade=t=in:d=0.12:color=white"
seg s15.mp4 $U/3547506d-IMG_4723.mov 6.3 2.5 1.0 "" 0.15 30 rendidos.png 0.3 ""
ffmpeg -y -v error -loop 1 -t 4.0 -i cierre.png -f lavfi -t 4.0 -i anullsrc=r=48000:cl=stereo -filter_complex "[0:v]fps=30,scale=w='trunc(1080*(1.0+0.04*t/4)/2)*2':h=-2:eval=frame,crop=1080:1920,setsar=1,format=yuv420p,fade=t=in:d=0.1:color=white[v]" -map "[v]" -map 1:a -c:v libx264 -crf 17 -c:a aac s16.mp4
# unir
L=""; for i in $(seq -w 1 16); do L="$L -i s$i.mp4"; done
C=""; for i in $(seq 0 15); do C="$C[$i:v]setsar=1[v$i];"; done; for i in $(seq 0 15); do C="$C[v$i][$i:a]"; done
ffmpeg -y -v error $L -filter_complex "${C}concat=n=16:v=1:a=1[v][a]" -map "[v]" -map "[a]" -c:v libx264 -crf 17 -c:a aac -b:a 192k base.mp4
