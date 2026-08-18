// Serializador de JSON-LD seguro para inyección en <script type="application/ld+json">.
// JSON.stringify NO escapa la secuencia "</" — cualquier string de un objeto
// puede cerrar prematuramente el <script> con "</script><script>alert(1)</script>"
// y provocar XSS almacenado desde admin al público. Este helper reemplaza "<"
// por "<", que es JSON válido y browsers/parsers lo interpretan igual.
//
// Uso: en cualquier <script type="application/ld+json" dangerouslySetInnerHTML=
// { __html: safeJsonLd(objeto) } />, siempre — cero excepciones aunque el
// contenido parezca "controlado" hoy (mañana puede llegar de admin/KV/API).
//
// También escapa U+2028 y U+2029 (line separators) que son válidos en JSON
// pero rompen JavaScript inline: cobertura extra ante evaluaciones legacy
// que hicieran eval() del script.
const LT = /</g;
const LS = new RegExp(String.fromCharCode(0x2028), "g");
const PS = new RegExp(String.fromCharCode(0x2029), "g");

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(LT, "\\u003c")
    .replace(LS, "\\u2028")
    .replace(PS, "\\u2029");
}
