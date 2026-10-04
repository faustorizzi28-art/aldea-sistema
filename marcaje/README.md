# Aldea de Valle — Sistema de marcaje de horarios (oct 2026)

## Qué es
App web para el celular. Cada empleado entra con su nombre y un PIN de 4 números y marca entrada y salida. Solo puede marcar si el GPS lo ubica a menos de 100 m del centro de Aldea (República de China 1890, Valle Escondido).

- **Backend:** Google Sheet "Aldea — Marcaje" con Apps Script (`Code.gs`). Tiene las hojas Empleados, Marcajes, Config y Ajustes (extras y descuentos del mes), más una hoja "Liquidación AAAA-MM" por cada mes guardado.
- **Frontend:** `index.html` publicado en Netlify (necesita https para el GPS). La parte de administrador está protegida con PIN y tiene cuatro secciones: Resumen, Marcajes, Equipo y Ajustes.
- La liquidación es mensual. Hay recibo por empleado (para imprimir o mandar por WhatsApp) y exportación a CSV.
- Cada empleado puede ver sus propias horas y lo que lleva para cobrar en el mes.

Instalación y uso: [INSTRUCCIONES.md](INSTRUCCIONES.md). Mensajes para el equipo: [MENSAJE_WHATSAPP.md](MENSAJE_WHATSAPP.md).

## Formas de pago (definidas por Fausto, 04/10/2026)
- Mantenimiento: $6.000 la hora.
- Papá (mantenimiento): sueldo fijo de $500.000 por mes. Marca horario igual, para que quede el registro.
- Karina (limpieza): $207.200 por semana. Trabaja 6 h; los días por semana todavía no están confirmados (se cargaron 30 h semanales como supuesto).
- Cantina: $5.500 la hora para uno y $6.500 la hora para otro.
- Profes: solo trabajan en eventos especiales, a $50.000 por cumpleaños.
- También hay personal de limpieza y seguridad que trabaja solo en eventos especiales; se carga con la forma de pago "por evento".
- Se puede sumar gente nueva desde el panel. Lo más común es que se incorpore alguien para limpieza.

`setup()` carga este equipo inicial. Los nombres que faltan quedan como “(poner nombre)” para completar desde **Equipo**.

## Instalación (hecha el 04/10/2026)
- App: https://courageous-cactus-c7d3a7.netlify.app (subida a mano con Netlify Drop, no se actualiza sola desde GitHub).
- Centro del predio: -31.364971, -64.278477. Radio: 100 m.

## Pendiente
- Que cada empleado responda por WhatsApp con su valor hora, sus tareas y sus horarios. El mensaje ya está armado.
- Revisar los valores después de las primeras semanas de uso.
