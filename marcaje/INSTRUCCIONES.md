# Instalación — Marcaje de horarios de Aldea

Lleva unos 15 minutos. Hacelo desde la computadora; el último paso, desde el celular y parado en Aldea.

## 1. Crear el Google Sheet

1. Entrá a [sheets.new](https://sheets.new) con la cuenta de Google de Aldea.
2. Ponele de nombre **Aldea — Marcaje**.

## 2. Pegar el código

1. En el Sheet: **Extensiones → Apps Script**.
2. Borrá lo que aparece en `Código.gs` y pegá todo el contenido de `marcaje/Code.gs`.
3. Guardá con el ícono del disquete.
4. Arriba, en la lista de funciones, elegí **setup** y tocá **Ejecutar**.
   - La primera vez Google pide permisos: **Revisar permisos → tu cuenta → Configuración avanzada → Ir a (no seguro) → Permitir**. Es normal: el script es tuyo.
5. Volvé al Sheet. Vas a ver las hojas **Empleados**, **Marcajes**, **Config** y **Ajustes**. En **Empleados** ya está cargado el equipo inicial, cada uno con un PIN al azar.

> El PIN del panel de administrador es **2026**. Cambialo en el paso 5.

## 3. Publicar el backend

1. En Apps Script: **Implementar → Nueva implementación**.
2. Tipo (ruedita ⚙️): **Aplicación web**.
3. *Ejecutar como*: **Yo**. *Quién tiene acceso*: **Cualquier usuario**.
4. **Implementar** y copiá la **URL de la aplicación web** (termina en `/exec`).
5. Abrí `marcaje/index.html` y pegala en la línea:
   ```js
   const API_URL_FIJA = '';
   ```
   quedando `const API_URL_FIJA = 'https://script.google.com/macros/s/…/exec';`

> Si más adelante cambiás `Code.gs`: **Implementar → Administrar implementaciones → ✏️ → Versión: Nueva versión → Implementar**. Así la URL no cambia.

## 4. Publicar la app en Netlify

El GPS solo funciona con `https`, por eso va en Netlify.

- **Si el sitio de Aldea ya está en Netlify conectado a este repositorio:** con hacer push alcanza. La app queda en `https://<tu-sitio>.netlify.app/marcaje/`.
- **Si no:** entrá a [app.netlify.com/drop](https://app.netlify.com/drop) y arrastrá la carpeta `marcaje`. Te da un link `https://…netlify.app`.

## 5. Configurar desde el celular (parado en Aldea)

1. Abrí el link de la app y tocá **Soy administrador**. Entrá con el PIN **2026**.
2. **Ajustes → 📍 Usar mi ubicación**, parado en el **centro del predio** y al aire libre. Esperá a que la precisión sea buena (menos de ±20 m) y tocá **Guardar**.
3. Tocá **¿A cuánto estoy?** para comprobarlo. Si querés, caminá hasta la entrada y probá de nuevo: tiene que decir que se puede marcar.
4. **Ajustes → PIN de administrador**: poné uno nuevo.
5. **Equipo**: corregí los nombres que dicen “(poner nombre)”, cargá los celulares y revisá los valores.
6. En cada persona, tocá **Mandar acceso**. Le llega por WhatsApp el link, su nombre y su PIN.

## Uso diario

- **Empleados:** abren la app, tocan **Marcar ENTRADA** al llegar y **Marcar SALIDA** al irse. El celular los recuerda, así que el PIN se pone una sola vez.
- **Si alguien se olvida de marcar:** aparece en **Resumen → turnos para corregir**. Tocá **Corregir** y cargá la hora a mano.
- **Fin de mes:** en **Resumen** revisá los totales y cargá extras o descuentos (adelantos, un cumpleaños de más). Después **Guardar liquidación** crea la hoja “Liquidación AAAA-MM” en el Sheet. Con **Recibo** imprimís o guardás un PDF, y con **WhatsApp** le mandás el detalle a cada uno.
- **Sumar a alguien nuevo:** **Equipo → + Sumar persona**, elegí un modelo (por ejemplo “Limpieza por hora”), poné el nombre y el celular, y **Guardar**. Te ofrece mandarle el acceso.
- **Si alguien deja de trabajar:** editalo y destildá **Activo**. Sus horas anteriores quedan guardadas.

## Cómo se calcula

| Forma de pago | Cálculo |
|---|---|
| Por hora | horas marcadas × valor de la hora |
| Sueldo mensual fijo | el sueldo completo (las horas quedan solo como registro) |
| Por semana | horas marcadas × (valor semanal ÷ horas por semana). Karina: $207.200 ÷ 30 h = $6.907 la hora |
| Por evento | cada turno (entrada + salida) es un evento × valor del evento |

- Un turno sin salida **no suma horas** hasta que lo corregís.
- Una entrada de hace más de 16 h sin salida se toma como olvido: la próxima vez que esa persona marque, se registra una entrada nueva.
- La hora la pone el servidor, no el celular. La distancia al predio se vuelve a calcular en el servidor.

## Problemas comunes

- **“No diste permiso de ubicación”:** en el navegador, tocá el candado de la barra de direcciones → Permisos → Ubicación → Permitir.
- **“Estás a 300 m de Aldea” estando adentro:** el GPS recién prendido puede errar. Hay que esperar unos segundos al aire libre y probar de nuevo. Si pasa seguido, subí el radio en Ajustes (por ejemplo a 150 m).
- **Alguien se olvidó el PIN:** lo ves en **Equipo** o en la hoja Empleados.
- **Olvidaste el PIN de administrador:** está en la hoja **Config**, fila `pinAdmin`.
