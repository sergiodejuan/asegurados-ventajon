# Programa "Amigos Ventajon" — configuración operativa

Sistema de referidos con doble incentivo 20€ Amazon eGift (referido al opt-in +
referidor al contratar el amigo + N días de gracia). Pagos automatizados vía
Tremendous. Solo clientes con al menos una póliza en status `ganado` pueden
generar código.

## Rutas

- `/referidos` — landing pública editable (indexable).
- `/r/{codigo}` — landing personalizada del amigo (noindex, reutiliza la
  paid de salud con kicker "{referidor} te invita").
- `/referidos/opt-in?ok=1|0` — página tras clic del email de opt-in.
- `/admin/campanas/referidos` — editor (incentivo, textos, FAQ, activar/pausar).

## API

Público:
- `POST /api/referral/generate` — cliente contratado obtiene su código.
  Body: `{ email?: string; telefono?: string }`. Rate limit 5/5min + Turnstile.
- `GET/POST /api/referral/opt-in?token=…` — valida token del email y dispara
  pago automático al amigo.

Admin (auth `campana`):
- `GET /api/admin/referral/{code}` — devuelve el ReferralDoc con estado
  Tremendous en vivo de cada order.
- `PATCH /api/admin/referral/{code}` — `{ bloqueado?: boolean;
  cancelConvertido?: { leadId, motivo? } }`.
- `POST /api/admin/referral/{code}/retry` — reintento manual.
  Body: `{ leadId: string; lado: "referido" | "referidor" }`.

Cron (protegido con `CRON_SECRET`):
- `GET|POST /api/referral/process-payouts` — reintenta bonos referido en
  pending y paga bonos referidor cuando cumplen T+N días. Se ejecuta diario
  a las 04:00 UTC (ver `vercel.json`).

## Variables de entorno

Configurar en Vercel → Project Settings → Environment Variables.

### Obligatorias en producción

| Variable | Descripción |
|---|---|
| `TREMENDOUS_API_KEY` | Bearer token de la cuenta Tremendous (https://app.tremendous.com/rewards/api). |
| `TREMENDOUS_FUNDING_SOURCE_ID` | ID de la fuente de fondos (Balance, ACH, tarjeta). Se obtiene desde `GET /v2/funding_sources` o el panel. |
| `REFERRAL_TOKEN_SECRET` | Cadena aleatoria larga (32+ bytes base64) — firma los tokens HMAC de opt-in. **Aislada** de otros secretos. |
| `CRON_SECRET` | Bearer para proteger `/api/referral/process-payouts`. Vercel lo pasa automáticamente si está definido. |

### Opcionales / recomendadas

| Variable | Descripción |
|---|---|
| `TREMENDOUS_CAMPAIGN_ID` | ID de una **campaña** de Tremendous que restrinja los productos entregables (crear una "Amazon.es EUR" en el panel para que el usuario NO pueda cambiar a otro vale). |
| `TREMENDOUS_BASE_URL` | Por defecto producción (`https://api.tremendous.com/api/v2`). En dev/QA usar sandbox: `https://testflight.tremendous.com/api/v2` (dinero ficticio). |

## Setup inicial (una vez)

1. Crear cuenta en https://tremendous.com. Verificar identidad.
2. Añadir método de fondos (transferencia SEPA o tarjeta). Cargar saldo.
3. **Copiar** el `funding_source_id` desde el panel → Settings → Funding.
4. Crear una campaña "Amazon.es 20€":
   - Panel → Campaigns → New campaign.
   - Reward types: Amazon.com → **Amazon.es** (marketplace España).
   - Denominations: 20 EUR (o rango 10-50 si se quiere flexibilidad).
   - Copiar el `campaign_id`.
5. Generar API key: Settings → API keys → "Production key".
6. Configurar las 4 variables obligatorias + las 2 opcionales en Vercel.
7. Redeploy. `POST /api/referral/generate` desde el panel para probar que
   crea código sin errores.
8. Test end-to-end en sandbox (cambiar `TREMENDOUS_BASE_URL` a testflight):
   - Generar código con un lead-test que tenga presupuesto ganado.
   - Abrir `/r/{code}` como amigo → completar comparativa → recibir email
     opt-in → clic → verificar Tremendous dashboard muestra order en sandbox.

## Máquina de estados de cada convertido

```
cotizado ──(opt-in email clic)──> opt-in ──(pago Tremendous OK)──> [bono referido pagado]
                                    │
                                    │ (asesor marca presupuesto=ganado)
                                    ▼
                                contratado ──(T+N días cron)──> pagado (bono referidor OK)
                                    │
                                    └──(admin cancela)──> cancelado (sin pago referidor)
```

## Fiscalidad

- Los vales Amazon eGift pueden considerarse rendimiento en especie según la
  AEAT si el mismo receptor supera 300€/año. La responsabilidad fiscal es
  del receptor — mostrado en el disclaimer legal de la landing.
- La empresa lleva registro contable de los envíos como gasto de marketing
  (concepto: "Programa referidos — Amazon eGift"). Tremendous emite factura
  mensual consolidada.

## Compliance RGPD/LSSI

- Ningún referidor introduce el email del amigo — solo comparte el link.
- El amigo entra por su decisión (art. 6.1.a RGPD).
- Doble opt-in email obligatorio antes de enviar el vale.
- No enviamos publicidad al email del amigo salvo consentimiento adicional
  (marca la casilla "quiero recibir comunicaciones comerciales" en el
  tarificador).

## Modo degradado

Si `TREMENDOUS_API_KEY` no está configurada:

- La landing pública sigue funcionando (los códigos se generan igual).
- Los emails de opt-in se envían.
- El pago automático falla con `503 Tremendous no configurado`; el
  convertido queda en status "opt-in" con `ultimoErrorPago` registrado.
- El equipo puede procesar manualmente desde el panel admin o desde el
  panel de Tremendous cuando se configure.
