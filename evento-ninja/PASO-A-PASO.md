# Paso a paso para publicar la web del Ninja

Necesitás una computadora (en el celular el editor de Apps Script no anda bien)
y entrar con la cuenta de Google dueña de la planilla
"Aldea del Valle — Base de Datos".

Archivos (están en esta carpeta):
- `Code.gs` → el "motor" (guarda las inscripciones en la planilla).
- `index.html` → la página (230 KB). El video del Ninja abre el posteo de Instagram (paso 8).

## 1. Crear el proyecto
1. Entrá a **script.google.com**.
2. Tocá **Nuevo proyecto** (arriba a la izquierda).
3. Arriba, donde dice "Proyecto sin título", tocá y ponele **Inscripción Ninja**.

## 2. Pegar el motor
4. A la izquierda vas a ver el archivo **Código.gs** abierto con unas líneas de ejemplo.
5. Borrá todo (Ctrl+A y Suprimir).
6. Abrí `Code.gs`, copiá **todo** (Ctrl+A, Ctrl+C) y pegalo ahí (Ctrl+V).
7. Guardá con **Ctrl+S** (o el ícono del disquete).

## 3. Pegar la página
8. A la izquierda, al lado de "Archivos", tocá el **+** → **HTML**.
9. Escribí el nombre exacto **Index** (con I mayúscula, sin ".html") y Enter.
10. Borrá lo que trae de ejemplo.
11. Abrí `index.html` (con el Bloc de notas, **no** con el navegador: clic derecho →
    Abrir con → Bloc de notas), copiá todo y pegalo en Index.
    Revisá que la última línea del editor sea `</html>` (si no, se cortó al pegar).
12. Guardá con **Ctrl+S**.

## 4. Probar que conecta con la planilla
13. Arriba, en la lista de funciones (al lado de "Depurar"), elegí **estado** y tocá **▶ Ejecutar**.
14. Te va a pedir permisos: **Revisar permisos** → elegí tu cuenta →
    si aparece "Google no verificó esta app": **Configuración avanzada** →
    **Ir a Inscripción Ninja (no seguro)** → **Permitir**.
    (Es seguro: la app sos vos.)
15. Abajo debe decir "Ejecución completada". En la planilla aparece sola la
    pestaña **Ninja Cannetti** con los títulos de las columnas.

## 5. Publicar
16. Arriba a la derecha: **Implementar** → **Nueva implementación**.
17. En el engranaje ⚙ de "Seleccionar tipo" elegí **Aplicación web**.
18. Completá:
    - Descripción: `v1`
    - Ejecutar como: **Yo**
    - Quién tiene acceso: **Cualquier usuario**
19. **Implementar**. Copiá la **URL de la aplicación web** (termina en `/exec`).
    **Ese es el link para compartir** (bio de Instagram, historias, estados, grupos).

## 6. Prueba real (antes de difundir)
20. Abrí el link en tu celular y hacé una inscripción de prueba con tus datos.
21. Revisá que: aparece la fila en la pestaña "Ninja Cannetti", te llega el mail,
    y el botón de WhatsApp le escribe a Valeria.
22. Borrá esa fila de prueba de la planilla.

## 7. Que se liberen solos los que no pagan (48 hs)
23. En el editor, a la izquierda, el ícono del reloj ⏰ **Activadores** →
    **+ Añadir activador**.
24. Función: **liberarVencidas** · Fuente: **Según tiempo** · Tipo: **Temporizador por horas** ·
    **Cada hora** → Guardar.
    > Importante: Valeria tiene que marcar "✅ Pagado" apenas recibe cada
    > comprobante; si no, a las 48 hs ese lugar se cancela.

## Uso diario
- Llega un comprobante → en la planilla, columna Estado: **✅ Pagado**.
- Alguien se baja → Estado: **❌ Cancelado** (se libera el lugar).
- Día anterior al evento: en el editor elegí **armarListaAcreditacion** → ▶ Ejecutar →
  aparece la pestaña **Acreditación** → Archivo → Imprimir.

## Si después hay que cambiar algo
1. Cambiás el texto en el editor y guardás.
2. **Implementar** → **Administrar implementaciones** → ✏️ lápiz →
   Versión: **Nueva versión** → **Implementar**.
   Así el link `/exec` sigue siendo el mismo.

## 8. Video del Ninja
El botón de play abre el posteo de Instagram con el video:
https://www.instagram.com/p/Dek7zAuRKdA/
Para cambiarlo: en el archivo **Index** buscá (Ctrl+F) `VIDEO_INSTAGRAM` y reemplazá el link.
