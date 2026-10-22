# Inscripción evento Ninja Cannetti — Aldea del Valle × The Clan

Página pública para vender las entradas del evento con Guido "Ninja"
Cannetti (ex UFC, hoy BKFC): **sábado 14 de noviembre, 16hs, Aldea de
Valle**. Seminario de MMA, Muay Thai, kickboxing y tips de puño limpio,
técnicas frente a frente, charla, fotos, sorteo de guantes y tibiales, y
asado con el Ninja.

## Qué hace

**Para quien se inscribe** (pensada para el celular)
- Elige **Entreno** (seminario, cupo 120) o **Solo miro** (espectador, cupo aparte de 80).
- El precio del seminario **cambia solo según la fecha**: $42.000 hasta el
  31/10, $49.000 hasta el 13/11, $55.000 el 14/11. Las etapas pasadas se
  ven tachadas. Espectador: $15.000 (provisorio).
- Puede sumar **asado + bebida libre** ($22.000 por persona) para él y
  acompañantes (hasta 6). El asado se cierra solo el **11/11** (3 días antes).
- Ve el detalle y el total; al confirmar recibe su código (NC-001…), que es
  también su número de sorteo, el alias con botón "Copiar" y un botón para
  mandarle el comprobante a **Valeria** por WhatsApp. Tiene **48 hs** para pagar.
- Cupo lleno → se cierra esa entrada y aparece "Lista de espera".

**Para ustedes**
- Todo entra en la pestaña **Ninja Cannetti** del Sheet de siempre: tipo,
  datos, tarifa, personas de asado, total a pagar y estado "⏳ Falta pago".
- Mail por cada inscripción con el conteo (ej. "37/120").
- Llegó el comprobante → estado "✅ Pagado".
- **48 hs sin pago**: la función `liberarVencidas` las pasa a "❌ Cancelado
  (sin pago 48hs)" y se libera el lugar. Para que corra sola: en el editor
  de Apps Script → ⏰ Activadores → Añadir activador → función
  `liberarVencidas` → Según tiempo → Cada hora. *Ojo: antes de que corra,
  Valeria tiene que haber marcado "Pagado" a los que ya mandaron comprobante.*
- **Lista impresa para acreditar**: el día anterior correr
  `armarListaAcreditacion` (en el editor, elegirla arriba y ▶ Ejecutar).
  Crea la pestaña "Acreditación" con los pagados por orden alfabético, tipo,
  código, cuántas pulseras de asado y columna para firma del deslinde.
  Archivo → Imprimir.

## Antes de publicar — completar
En `Code.gs`, bloque `CONFIG`:
- `pago`: **alias, banco y titular** de la cuenta del evento.
- `precioEspectador`: confirmar (está en $15.000).
- `cupoEspectadores`: confirmar (está en 80).

Fotos: van embebidas dentro de `index.html` (así funcionan en Apps Script sin subir nada aparte). Los originales recortados están en `img/`.

## Instalación
1. **script.google.com** → Nuevo proyecto.
2. Pegá `Code.gs` completo.
3. **+** → **HTML** → nombre exacto **Index** → pegá `index.html`.
4. Guardá → **Implementar → Nueva implementación → Aplicación web** →
   Ejecutar como **Yo** → Acceso **Cualquier usuario** → aceptar permisos.
5. El link que termina en `/exec` es el que se comparte.

Si después cambiás algo: Implementar → Administrar implementaciones → ✏️ →
**Nueva versión** (el link no cambia).

Abierta directo en el navegador (sin Apps Script) funciona en **modo
vista previa**: muestra todo pero no guarda.

## Números del evento
Costo Ninja (honorario + traslado + hospedaje + comida): **$1.500.000 a $2.000.000**.

| Inscriptos seminario | a $49.000 | menos costo máx. $2M |
|---|---|---|
| 41 (punto de equilibrio) | $2.009.000 | ≈ $0 |
| 60 | $2.940.000 | $940.000 |
| 100 (objetivo) | $4.900.000 | $2.900.000 |
| 120 (cupo lleno) | $5.880.000 | $3.880.000 |

Con 40 en preventa ($42.000) y 60 a $49.000: **$4.620.000** a 100 inscriptos.
Espectadores y asado van aparte (el asado deja margen solo si $22.000 cubre
carne + bebida libre con alcohol hasta la 1am: calcularlo con el proveedor).
Falta restar sonido, fotógrafo, sorteo (guantes y tibiales) y la parte de The Clan.

Pendientes de organización: ver `PREGUNTAS.md`.
