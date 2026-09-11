# Tarificador de salud por WhatsApp (ManyChat + Codeoscopic)

Un flow de ManyChat pide al usuario los datos mínimos por WhatsApp,
llama a este endpoint con "External Request", y responde al usuario
con la mejor tarifa firme que devuelve Codeoscopic — todo en un único
turno de conversación (hasta 60 s).

## Endpoint

`POST /api/manychat/salud-quote`

Headers:
- `x-manychat-secret: <MANYCHAT_WEBHOOK_SECRET>`
- `Content-Type: application/json`

Body (todos los campos son opcionales excepto `telefono`; los que
falten hacen que la respuesta caiga a `estado="faltan_datos"` con el
motivo exacto en el `mensaje`):

```json
{
  "telefono": "+34600000000",
  "nombre": "Sergio",
  "apellido1": "de Juan",
  "apellido2": "García",
  "email": "sergio@example.com",
  "fechaNacimiento": "12/03/1985",
  "sexo": "hombre",
  "documento": "12345678A",
  "documentoTipo": "DNI",
  "codigoPostal": "07001",
  "numAsegurados": 1,
  "coberturaDental": false,
  "fumador": false,
  "aceptaPrivacidad": true
}
```

## Respuesta

Siempre JSON con los mismos campos (sin arrays, para poder pegarlos en
campos personalizados de ManyChat):

```json
{
  "ok": true,
  "estado": "cotizado",
  "leadId": "uuid",
  "insuranceId": "codeoscopic-id",
  "compania": "Adeslas",
  "producto": "Adeslas Plena",
  "precio": 42.5,
  "precioTexto": "42,50€/mes",
  "mensaje": "Tu mejor tarifa ahora mismo:\n\n• Adeslas — Adeslas Plena\n• Desde 42,50€/mes\n\n¿Quieres que un asesor te cierre la póliza con esta compañía?"
}
```

`estado` puede ser:
- `cotizado` — hay al menos una oferta firme; `precio` está relleno.
- `calculando` — Codeoscopic no ha devuelto ofertas a tiempo (>50 s).
  El asesor cierra en el siguiente paso. El lead queda creado.
- `faltan_datos` — falta algún campo obligatorio. `mensaje` pide al
  usuario el dato concreto (p. ej. "¿me dices tu DNI?").
- `error` — problema técnico. Mensaje neutro; el asesor toma el relevo.

## Datos que **Codeoscopic exige** para una tarifa firme

Los campos obligatorios los impone su API `POST /insurances`:

- Nombre, primer apellido, **segundo apellido** (los tres).
- DNI/NIE del titular. **No sirve el precio sin documento**, aunque
  parezca sorprendente.
- Fecha de nacimiento y sexo del titular.
- Código postal real (para resolver el municipio).
- Nº de asegurados (por defecto 1 = el titular).

Sin alguno de estos, el endpoint responde `faltan_datos` con el motivo
concreto en `mensaje` — copia ese texto en el siguiente Send Message de
ManyChat.

## Diseño del flow (sugerido)

1. Trigger: keyword "precio salud" en WhatsApp.
2. Comprueba si el contacto ya existe llamando primero a
   `/api/manychat/cliente` (ya en producción) — así reutilizas los datos
   que ya tengas y solo pides los que falten.
3. Pregunta secuencialmente por los campos que faltan. Guarda cada uno
   en un campo personalizado del contacto.
4. External Request → `/api/manychat/salud-quote` con todos los datos.
5. En función de `estado`:
   - `cotizado` → envía `{{mensaje}}` y ofrece dos botones:
     "Contratar" / "Ver otras opciones".
   - `calculando` → envía `{{mensaje}}` ("estoy calculando, en un par de
     minutos te envío las opciones") y crea una tarea al equipo (ya se
     dispara vía `notifyTeamNewLead` porque el lead se ha creado con
     source="manychat").
   - `faltan_datos` → envía `{{mensaje}}` y vuelve al paso que pida
     ese dato.
6. Guarda `leadId` en un campo personalizado — te sirve para todas las
   integraciones posteriores del contacto.

## Autenticación

Reutiliza `MANYCHAT_WEBHOOK_SECRET`, el mismo secreto que ya usa
`/api/manychat/cliente`. Configúralo en Vercel y ponlo como header
estático en el External Request de ManyChat.

## Rate limit

20 tarifas por hora por IP (ManyChat sale desde su propio rango, así
que en la práctica actúa como cap global de la integración).

## Modo degradado

- Si `CODEOSCOPIC_*` no está configurado, el endpoint sigue creando el
  lead pero responde `estado="calculando"` con mensaje neutro. El asesor
  hace el cierre a mano.
- Si `POST /insurances` de Codeoscopic falla, mismo tratamiento — el
  lead queda registrado y el flow continúa sin romperse.
