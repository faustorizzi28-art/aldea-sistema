# Inscripción evento Ninja Cannetti — Aldea del Valle × Teclan

Página pública para vender las entradas/inscripciones del evento con
Guido "Ninja" Cannetti (ex UFC, hoy BKFC), **sábado 14 de noviembre en
Aldea de Valle**. Cupo máximo 120, objetivo 100.

## Qué hace

**Para quien se inscribe** (pensada para el celular)
- Ve quién es el Ninja, qué incluye el evento, la cuenta regresiva y
  cuántos lugares quedan (barra de cupo en vivo).
- El precio cambia solo según la fecha (preventa → general → última hora).
- Completa nombre, DNI, WhatsApp, email (opcional), qué entrena y acepta
  el deslinde. Le aparece su código (NC-001, NC-002…), el alias con botón
  "Copiar" y un botón para mandar el comprobante por WhatsApp.
- Si el cupo se llena, el formulario se cierra y aparece "Lista de espera".

**Para vos**
- Cada inscripción entra en la pestaña **Ninja Cannetti** del Sheet de
  siempre (se crea sola), con estado "⏳ Falta pago".
- Te llega un mail con el conteo (ej. "37/120") y un botón para escribirle.
- Llegó el comprobante → cambiá el estado a "✅ Pagado".
- No pagó y querés liberar el lugar → "❌ Cancelado" (deja de contar para el cupo).
- No deja anotar dos veces el mismo DNI.

## Antes de publicar — completar

En `Code.gs`, bloque `CONFIG`:
- `pago`: **alias, banco y titular** de la cuenta que se arme con Teclan.
- `precios`: montos y fechas de corte (hoy: $42.000 hasta 31/10,
  $49.000 hasta 13/11, $55.000 el 14/11).
- `whatsapp`: número que recibe comprobantes (hoy el mismo de la cancha).

En `index.html` (abajo, en el `<script>`):
- `EVENTO`: **hora** de inicio (está puesta a las 16:00 provisoria).
- `WHATSAPP`: el mismo número de arriba.
- La sección "El evento" describe seminario + charla + fotos: ajustar si el
  formato acordado con Teclan es otro.

Foto: si Teclan o el Ninja pasan una foto con permiso de uso, subila como
`img/ninja-cannetti.jpg` y cambiá el `src` a una URL pública (dentro de
Apps Script no hay carpeta `img`). Sin foto se ve un cuadro con "10 victorias".

## Instalación (igual que la reserva de cancha)

1. **script.google.com** → Nuevo proyecto.
2. Pegá `Code.gs` completo.
3. **+** → **HTML** → nombre exacto **Index** → pegá `index.html`.
4. Guardá → **Implementar → Nueva implementación → Aplicación web** →
   Ejecutar como **Yo** → Acceso **Cualquier usuario** → aceptar permisos.
5. El link que termina en `/exec` es el que se comparte (bio de Instagram,
   historias, estados, grupos).

Si después cambiás algo: Implementar → Administrar implementaciones → ✏️ →
**Nueva versión** (así el link no cambia).

Abierta directo en el navegador (sin Apps Script) la página funciona en
**modo vista previa**: muestra todo pero no guarda inscripciones.

## Números del evento

Costo Ninja (honorario + traslado + hospedaje + comida): **$1.500.000 a $2.000.000**.

| Inscriptos | a $49.000 | menos costo máx. $2M |
|---|---|---|
| 41 (punto de equilibrio) | $2.009.000 | ≈ $0 |
| 60 | $2.940.000 | $940.000 |
| 100 (objetivo) | $4.900.000 | $2.900.000 |
| 120 (cupo lleno) | $5.880.000 | $3.880.000 |

Con el escalonado propuesto, si los primeros 40 entran en preventa
($42.000) y 60 más a $49.000, a 100 inscriptos se recaudan **$4.620.000**
(apenas $280.000 menos que todo a $49.000) a cambio de generar urgencia
desde el primer día. Ojo: falta restar gastos chicos (sonido, flyer/pauta,
seguro, colchonetas si hacen falta) y la parte que corresponda a Teclan.
