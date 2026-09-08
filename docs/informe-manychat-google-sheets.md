# Informe "Leads ManyChat" — conexión con Google Sheets

El informe `/admin/informes/manychat` lee **en vivo** la pestaña `DASHBOARD` de
la hoja maestra de Google Sheets a través de un **Web App de Google Apps
Script** protegido por un secreto compartido. Todo el cálculo vive en la hoja
(fórmulas); el proyecto solo lee de solo lectura y **nunca** toca las pestañas
con datos personales.

El fetch a Google ocurre en el **servidor** (ruta `app/api/admin/informes/manychat`),
así que el secreto nunca llega al navegador y la CSP del cliente no interviene.

## Cómo funciona el contrato

El Web App recibe `?token=<secreto>&refresh=<0|1>` y responde **JSON** con esta
forma (la hoja manda: un payload parcial también pinta):

```json
{
  "generatedAt": "2026-09-08T10:15:00.000Z",
  "kpis": [
    { "label": "Leads totales", "value": "1.240", "hint": "últimos 30 días" },
    { "label": "Opt-in", "value": "812" },
    { "label": "Tarificados", "value": "506" },
    { "label": "Contratados", "value": "97" }
  ],
  "sections": [
    {
      "title": "Por origen (UTM source)",
      "columns": ["Origen", "Leads", "Opt-in", "Contratados"],
      "rows": [
        ["Meta Ads", "640", "410", "58"],
        ["Orgánico", "300", "250", "22"]
      ]
    }
  ]
}
```

- `kpis[]` → tarjetas numéricas arriba. `label` obligatorio, `value` texto ya
  formateado por la hoja, `hint` opcional.
- `sections[]` → tablas. `columns[]` es la cabecera; `rows[]` son filas de
  celdas de texto. Manda tantas secciones como quieras.
- `generatedAt` (ISO) es opcional; si falta, se usa la hora del servidor.

La página normaliza y renderiza lo que llegue, así que puedes ampliar el
DASHBOARD sin tocar el código: basta con que el script publique más `kpis` o
`sections`.

## Paso 1 — Apps Script en la hoja

En la hoja maestra: **Extensiones → Apps Script**. Pega este código, ajústalo al
rango de tu pestaña `DASHBOARD` y guarda:

```javascript
// === Config ===
// Fija el secreto en: Configuración del proyecto (⚙) → Propiedades del script
//   Propiedad:  SECRET   Valor: <un secreto largo y aleatorio>
// Debe coincidir con SHEETS_WEBAPP_SECRET en las variables de entorno del proyecto.
var DASHBOARD_SHEET = 'DASHBOARD';

function doGet(e) {
  var props = PropertiesService.getScriptProperties();
  var expected = props.getProperty('SECRET');
  var token = (e && e.parameter && e.parameter.token) || '';

  // Comparación en tiempo constante para no filtrar el secreto por timing.
  if (!expected || !safeEqual(token, expected)) {
    return json({ ok: false, error: 'Secreto inválido.' });
  }

  var payload = buildDashboard();
  return json(payload);
}

// Lee la pestaña DASHBOARD y arma el contrato { generatedAt, kpis, sections }.
// AJUSTA los rangos a tu hoja. Este ejemplo asume:
//   - KPIs en A1:C? con columnas [label, value, hint]
//   - Una tabla con cabecera en la fila 1 desde la columna E.
function buildDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(DASHBOARD_SHEET);
  if (!sh) return { ok: false, error: 'No existe la pestaña ' + DASHBOARD_SHEET + '.' };

  // --- KPIs: rango A2:C (label | value | hint), saltando filas vacías ---
  var kpiRange = sh.getRange('A2:C50').getValues();
  var kpis = [];
  for (var i = 0; i < kpiRange.length; i++) {
    var label = String(kpiRange[i][0] || '').trim();
    if (!label) continue;
    kpis.push({
      label: label,
      value: fmt(kpiRange[i][1]),
      hint: String(kpiRange[i][2] || '').trim(),
    });
  }

  // --- Tabla de ejemplo: cabecera E1:H1, datos E2:H? ---
  var tableRange = sh.getRange('E1:H100').getValues();
  var columns = (tableRange.shift() || []).map(function (c) { return String(c || '').trim(); })
    .filter(function (c) { return c !== ''; });
  var rows = [];
  for (var r = 0; r < tableRange.length; r++) {
    var row = tableRange[r].slice(0, columns.length).map(fmt);
    if (row.join('').trim() === '') continue; // fila vacía
    rows.push(row);
  }

  return {
    generatedAt: new Date().toISOString(),
    kpis: kpis,
    sections: [
      { title: 'Trazabilidad', columns: columns, rows: rows },
    ],
  };
}

// Formatea números/fechas a texto legible (es-ES). Ajusta a tu gusto.
function fmt(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  if (typeof v === 'number') return v.toLocaleString('es-ES');
  return String(v);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var out = 0;
  for (var i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
```

Fija el secreto en **⚙ Configuración del proyecto → Propiedades del script**:
crea la propiedad `SECRET` con un valor largo y aleatorio.

## Paso 2 — Desplegar como Web App

**Implementar → Nueva implementación → Aplicación web**:

- **Ejecutar como:** yo (tu cuenta).
- **Quién tiene acceso:** Cualquiera.

Copia la **URL que termina en `/exec`** (no la de `/dev`).

> Cada vez que cambies el código, usa **Implementar → Gestionar implementaciones
> → editar (lápiz) → Nueva versión** para que la URL `/exec` sirva el código
> nuevo, o crea una implementación nueva y actualiza `SHEETS_WEBAPP_URL`.

## Paso 3 — Variables de entorno del proyecto

En las variables de entorno (Vercel → Settings → Environment Variables) añade:

| Variable                | Valor                                              |
| ----------------------- | -------------------------------------------------- |
| `SHEETS_WEBAPP_URL`     | La URL `.../exec` del despliegue.                  |
| `SHEETS_WEBAPP_SECRET`  | El mismo secreto que fijaste como `SECRET`.        |

**Redespliega** el proyecto y pulsa **«Actualizar»** en la página del informe.

Mientras falte cualquiera de las dos variables, la página muestra estas mismas
instrucciones en vez de un error.

## Resolución de problemas

- **"El secreto no coincide…"** → `SHEETS_WEBAPP_SECRET` ≠ propiedad `SECRET` del
  script. Corrige y redespliega.
- **"El Web App no devolvió JSON…"** → normalmente el despliegue no es de acceso
  «Cualquiera» (Google devuelve una página de login), o usaste la URL `/dev` en
  vez de `/exec`. Reimplementa y usa `/exec`.
- **Respuesta `502` con un código de estado** → el despliegue está caído o
  requiere autorización; abre la URL `/exec` en el navegador para forzar la
  autorización inicial del script y confirma que responde JSON.
- **KPIs/tablas vacíos** → revisa que los rangos de `buildDashboard()` apunten a
  las celdas reales de tu pestaña `DASHBOARD`.
