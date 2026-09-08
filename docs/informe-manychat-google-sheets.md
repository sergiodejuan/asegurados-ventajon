# Informe "Leads ManyChat" — conexión con Google Sheets

Conecta el DASHBOARD de la hoja maestra
`BBDD_Asegurados_Ventajon_Leads_Maestro_V3` a la sección
`/admin/informes/manychat` del panel, **en vivo** y **sin exponer datos
personales**.

## Cómo funciona

El servidor de la web (no el navegador) lee la hoja a través de un **Web App de
Google Apps Script** publicado en la propia hoja y protegido por un **secreto
compartido**. El Web App solo devuelve el DASHBOARD (agregados: recuentos, %,
importes medios) — nunca las pestañas con leads individuales, así que no se
expone PII. La web lo consulta al abrir el informe, con una caché de 60 s y un
botón "Actualizar" que la salta.

```
Google Sheet (DASHBOARD) → Apps Script Web App (?token=SECRET)
   → GET /api/admin/informes/manychat (server, gate módulo "informes")
   → /admin/informes/manychat (UI)
```

## 1. Pega el script en la hoja

En la hoja: **Extensiones → Apps Script**. Si ya tienes otros scripts en el
proyecto (p. ej. `syncMaestro` en `Código.gs`), **no los borres**: crea un
archivo nuevo con **+ (Archivos) → Script**, llámalo `Informe`, y pega ahí
esto. Los dos archivos conviven en el mismo proyecto (las funciones son
globales entre archivos) y no hay colisión de nombres. Si la hoja no tenía
ningún script, puedes pegarlo directamente en `Código.gs`.

```javascript
// Web App de solo lectura del DASHBOARD para el panel de Asegurados Ventajon.
// Detecta cada sección por su título en la columna A y devuelve cabeceras +
// filas tal cual las MUESTRA la hoja (getDisplayValues: respeta %, € y formato).

var SHEET_NAME = 'DASHBOARD';
var SECTIONS = [
  { id: 'globales',     marker: 'KPIS GLOBALES',            title: 'KPIs globales (todos los flujos consolidados)' },
  { id: 'por-origen',   marker: 'DESGLOSE POR ORIGEN',       title: 'Desglose por origen (canal de entrada)' },
  { id: 'por-producto', marker: 'DESGLOSE POR PRODUCTO',     title: 'Desglose por producto' },
  { id: 'por-intencion',marker: 'DESGLOSE POR INTENCION',    title: 'Desglose por intención del portero' }
];

function norm(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .trim().toUpperCase();
}
function lastNonEmpty(arr) {
  var i = arr.length - 1;
  while (i >= 0 && String(arr[i]).trim() === '') i--;
  return i; // índice de la última celda no vacía (-1 si toda vacía)
}

function doGet(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
  var out = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  if (!secret) { out.setContent(JSON.stringify({ ok: false, reason: 'no_secret' })); return out; }
  var token = e && e.parameter ? e.parameter.token : '';
  if (token !== secret) { out.setContent(JSON.stringify({ ok: false, reason: 'unauthorized' })); return out; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { out.setContent(JSON.stringify({ ok: false, reason: 'sheet_not_found' })); return out; }

  var values = sheet.getDataRange().getDisplayValues();
  var markerRows = []; // filas que son un título de sección conocido
  for (var r = 0; r < values.length; r++) {
    var a = norm(values[r][0]);
    for (var s = 0; s < SECTIONS.length; s++) {
      if (a.indexOf(SECTIONS[s].marker) === 0) markerRows.push({ row: r, section: SECTIONS[s] });
    }
  }

  var blocks = [];
  for (var m = 0; m < markerRows.length; m++) {
    var headerRow = markerRows[m].row + 1;
    if (headerRow >= values.length) continue;
    var rawHeaders = values[headerRow];
    var lastCol = lastNonEmpty(rawHeaders);
    if (lastCol < 0) continue;
    var headers = rawHeaders.slice(0, lastCol + 1).map(function (h) { return String(h).trim(); });

    var rows = [];
    for (var r2 = headerRow + 1; r2 < values.length; r2++) {
      if (String(values[r2][0]).trim() === '') break;               // fila en blanco = fin de bloque
      if (norm(values[r2][0]).indexOf('DESGLOSE') === 0) break;      // siguiente sección
      if (norm(values[r2][0]).indexOf('KPIS') === 0) break;
      rows.push(values[r2].slice(0, headers.length).map(function (c) { return String(c).trim(); }));
    }
    blocks.push({ id: markerRows[m].section.id, title: markerRows[m].section.title, headers: headers, rows: rows });
  }

  out.setContent(JSON.stringify({
    ok: true,
    generatedAt: new Date().toISOString(),
    spreadsheetName: ss.getName(),
    blocks: blocks
  }));
  return out;
}
```

## 2. Fija el secreto

En Apps Script: **Configuración del proyecto (⚙) → Propiedades del script →
Añadir propiedad**:

- Propiedad: `SECRET`
- Valor: una cadena larga y aleatoria (p. ej. `openssl rand -base64 32`).

## 3. Publica el Web App

**Implementar → Nueva implementación → Tipo: Aplicación web**:

- Descripción: `Informe Leads ManyChat`
- Ejecutar como: **Yo** (tu cuenta, la que puede leer la hoja).
- Quién tiene acceso: **Cualquiera**.

Autoriza los permisos que pida y **copia la URL** que termina en `/exec`.

> El acceso "Cualquiera" es seguro porque el script exige el `token` correcto;
> sin él responde `{ ok:false, reason:"unauthorized" }` y nunca datos.

## 4. Configura la web

En las variables de entorno del proyecto (Vercel → Settings → Environment
Variables, o el `.env` del servidor propio):

```
SHEETS_WEBAPP_URL=https://script.google.com/macros/s/AKfyc.../exec
SHEETS_WEBAPP_SECRET=el-mismo-secreto-que-pusiste-en-el-script
```

Redespliega. Entra en **Admin → Analítica → Leads ManyChat** y pulsa
"Actualizar". Si no aparece la opción, tu usuario necesita el permiso de módulo
**Informes y analítica**.

## Notas

- El informe es **de solo lectura**: la web nunca escribe en la hoja.
- Cada vez que cambies el script hay que **volver a implementar** (o gestionar
  versiones) para que la URL `/exec` sirva la versión nueva.
- Si reordenas o renombras columnas del DASHBOARD, el informe se adapta (lee
  cabeceras + filas). Si cambias los **títulos** de sección (los `marker`),
  actualízalos también en `SECTIONS`.
- Rotación del secreto: cámbialo en Propiedades del script y en
  `SHEETS_WEBAPP_SECRET` a la vez.
