"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminToken } from "@/components/admin/AdminShell";
import { Close } from "@/components/icons";
import type { CodeoscopicQuoteSummary } from "@/lib/store";

type LeadOption = { id: string; nombre: string; telefono: string; email: string };
type ProductOption = {
  id: string; compania: string; precioConCopago?: number; precioSinCopago?: number; precio?: number;
  condiciones: string; servicios: string[];
};

const CODESCOPIC_POLL_MS = 3000;
const CODESCOPIC_MAX_POLLS = 10; // ~30s de margen, igual criterio que la comparativa pública

export function CreatePresupuestoModal({
  onClose, onCreated, lockedLead,
}: {
  onClose: () => void;
  onCreated: () => void;
  // Cuando se abre desde la ficha de un lead concreto (ver PresupuestosPanel
  // en app/admin/page.tsx): se omite el buscador/selector y el presupuesto
  // queda vinculado a este lead directamente. Sin esta prop (uso desde el
  // listado genérico /admin/presupuestos) se mantiene el buscador de siempre.
  lockedLead?: LeadOption;
}) {
  const { token } = useAdminToken();
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [leadQuery, setLeadQuery] = useState("");
  const [leadId, setLeadId] = useState(lockedLead?.id ?? "");
  const [producto, setProducto] = useState<"salud" | "vida" | "auto" | "decesos">("salud");
  const [mode, setMode] = useState<"catalog" | "custom">("catalog");
  const [catalog, setCatalog] = useState<ProductOption[]>([]);
  const [productId, setProductId] = useState("");
  const [compania, setCompania] = useState("");
  const [precio, setPrecio] = useState("");
  const [condiciones, setCondiciones] = useState("");
  const [servicios, setServicios] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cotización real Codeoscopic (solo salud) — ver
  // app/api/admin/leads/[id]/codeoscopic-quote.
  const [cqStatus, setCqStatus] = useState<"idle" | "loading" | "polling" | "done" | "error">("idle");
  const [cqError, setCqError] = useState<string | null>(null);
  const [cqQuotes, setCqQuotes] = useState<CodeoscopicQuoteSummary[]>([]);
  const [cqInsuranceId, setCqInsuranceId] = useState("");
  // Documento del titular: Codeoscopic lo exige para tarificar y el
  // tarificador público no lo recoge, así que el agente puede aportarlo aquí.
  const [cqDocumentoTipo, setCqDocumentoTipo] = useState<"Dni" | "Nie">("Dni");
  const [cqDocumento, setCqDocumento] = useState("");
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lockedLead) return; // sin buscador, no hace falta el listado completo
    fetch("/api/admin/leads", { headers: { "x-admin-token": token } })
      .then((r) => r.json())
      .then((body) => { if (body.ok) setLeads(body.leads); })
      .catch(() => {});
  }, [token, lockedLead]);

  useEffect(() => {
    fetch(`/api/admin/products?producto=${producto}`, { headers: { "x-admin-token": token } })
      .then((r) => r.json())
      .then((body) => { if (body.ok) { setCatalog(body.products); setProductId(""); } })
      .catch(() => {});
  }, [producto, token]);

  useEffect(() => () => { if (pollTimer.current) clearTimeout(pollTimer.current); }, []);

  const filteredLeads = useMemo(() => {
    const q = leadQuery.trim().toLowerCase();
    if (!q) return leads.slice(0, 20);
    return leads.filter((l) => `${l.nombre} ${l.telefono} ${l.email}`.toLowerCase().includes(q)).slice(0, 20);
  }, [leads, leadQuery]);

  const selectedProduct = catalog.find((p) => p.id === productId);

  useEffect(() => {
    if (mode !== "catalog" || !selectedProduct) return;
    setCompania(selectedProduct.compania);
    setPrecio(String(producto === "salud" ? selectedProduct.precioConCopago ?? "" : selectedProduct.precio ?? ""));
    setCondiciones(selectedProduct.condiciones);
    setServicios(selectedProduct.servicios.join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, mode]);

  function pollQuote(insuranceId: string, attempt: number) {
    fetch(`/api/quote/${encodeURIComponent(insuranceId)}`, { headers: { "x-admin-token": token } })
      .then((r) => r.json())
      .then((body) => {
        if (!body.ok) { setCqStatus("error"); setCqError("No se pudo consultar la cotización."); return; }
        setCqQuotes(body.summary.quotes ?? []);
        if (body.summary.done || attempt >= CODESCOPIC_MAX_POLLS) {
          setCqStatus("done");
          return;
        }
        setCqStatus("polling");
        pollTimer.current = setTimeout(() => pollQuote(insuranceId, attempt + 1), CODESCOPIC_POLL_MS);
      })
      .catch(() => { setCqStatus("error"); setCqError("Error de conexión al consultar la cotización."); });
  }

  async function consultarCodeoscopic() {
    if (!leadId) return;
    setCqStatus("loading");
    setCqError(null);
    setCqQuotes([]);
    setCqInsuranceId("");
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/codeoscopic-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(
          cqDocumento.trim()
            ? { documento: cqDocumento.trim(), documentoTipo: cqDocumentoTipo }
            : {}
        ),
      });
      const body = await res.json();
      if (!body.ok) {
        setCqStatus("error");
        setCqError(
          body.reason === "not_configured" ? "Codeoscopic no está configurado."
          : body.reason === "codeoscopic_error" ? "Codeoscopic no ha podido responder ahora mismo."
          : body.reason || body.error || "No se pudo consultar Codeoscopic."
        );
        return;
      }
      setCqInsuranceId(body.insuranceId);
      setCqQuotes(body.summary.quotes ?? []);
      if (body.summary.done) setCqStatus("done");
      else { setCqStatus("polling"); pollTimer.current = setTimeout(() => pollQuote(body.insuranceId, 1), CODESCOPIC_POLL_MS); }
    } catch {
      setCqStatus("error");
      setCqError("Error de conexión al consultar Codeoscopic.");
    }
  }

  function pickCodeoscopicQuote(q: CodeoscopicQuoteSummary) {
    setMode("custom");
    setCompania(q.compania);
    if (q.premium != null) setPrecio(String(q.premium));
  }

  async function submit() {
    setError(null);
    if (!leadId) { setError("Elige un lead."); return; }
    if (!compania.trim()) { setError("Falta la aseguradora."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/presupuestos", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({
          leadId, producto, compania: compania.trim(),
          precio: precio.trim() ? Number(precio) : undefined,
          condiciones: condiciones.trim(),
          servicios: servicios.split("\n").map((s) => s.trim()).filter(Boolean),
          codeoscopicInsuranceId: cqInsuranceId || undefined,
        }),
      });
      const body = await res.json();
      if (res.ok && body.ok) { onCreated(); return; }
      setError(body.error ?? "No se pudo crear el presupuesto.");
    } catch { setError("Error de conexión."); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[17px] font-extrabold text-navy">Crear presupuesto</h2>
          <button onClick={onClose} aria-label="Cerrar" className="shrink-0 text-slate2 hover:text-navy">
            <Close width={20} height={20} />
          </button>
        </div>

        {lockedLead ? (
          <p className="mt-4 text-[13px] text-slate2">
            Para <span className="font-semibold text-ink">{lockedLead.nombre || "este lead"}</span>
            {lockedLead.telefono ? ` · ${lockedLead.telefono}` : ""}
          </p>
        ) : (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[12px] font-semibold text-ink">Lead</span>
            <input value={leadQuery} onChange={(e) => setLeadQuery(e.target.value)} placeholder="Buscar por nombre, teléfono o email…"
              className="w-full rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]" />
            <select value={leadId} onChange={(e) => setLeadId(e.target.value)}
              className="mt-2 w-full rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]">
              <option value="">— Selecciona un lead —</option>
              {filteredLeads.map((l) => (
                <option key={l.id} value={l.id}>{l.nombre || "Sin nombre"} · {l.telefono}</option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-4 flex gap-2">
          {(["salud", "vida", "auto", "decesos"] as const).map((p) => (
            <button key={p} type="button" onClick={() => { setProducto(p); setCqStatus("idle"); }}
              className={`rounded-pill px-3.5 py-1.5 text-[13px] font-semibold capitalize transition-colors ${producto === p ? "bg-navy text-white" : "border border-hair bg-white text-navy hover:bg-mist"}`}>
              Seguro de {p}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2" role="tablist" aria-label="Origen del presupuesto">
          <button type="button" onClick={() => setMode("catalog")}
            className={`rounded-pill px-3 py-1.5 text-[12px] font-semibold transition-colors ${mode === "catalog" ? "bg-navy text-white" : "border border-hair bg-white text-navy hover:bg-mist"}`}>
            Del catálogo
          </button>
          <button type="button" onClick={() => setMode("custom")}
            className={`rounded-pill px-3 py-1.5 text-[12px] font-semibold transition-colors ${mode === "custom" ? "bg-navy text-white" : "border border-hair bg-white text-navy hover:bg-mist"}`}>
            Personalizado
          </button>
        </div>

        {mode === "catalog" && (
          <label className="mt-3 block">
            <span className="mb-1.5 block text-[12px] font-semibold text-ink">Producto guardado</span>
            <select value={productId} onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]">
              <option value="">— Selecciona —</option>
              {catalog.map((p) => (
                <option key={p.id} value={p.id}>{p.compania}</option>
              ))}
            </select>
          </label>
        )}

        {producto === "salud" && leadId && (
          <div className="mt-3 rounded-card border border-hair bg-mist/50 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-semibold text-ink">Precio real (Codeoscopic)</span>
              <button
                type="button" onClick={consultarCodeoscopic}
                disabled={cqStatus === "loading" || cqStatus === "polling"}
                className="rounded-pill border border-navy px-3 py-1 text-[11px] font-semibold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cqStatus === "loading" ? "Consultando…" : cqStatus === "polling" ? "Esperando aseguradoras…" : "Consultar precio real"}
              </button>
            </div>
            {/* DNI/NIE del titular: Codeoscopic lo exige para tarificar. Si el
                lead ya lo tiene guardado, se puede dejar vacío y se usará el
                suyo; si no, hay que teclearlo aquí para obtener precios. */}
            <div className="mt-2 flex items-end gap-2">
              <label className="shrink-0">
                <span className="mb-1 block text-[11px] font-semibold text-slate2">Tipo</span>
                <select value={cqDocumentoTipo} onChange={(e) => setCqDocumentoTipo(e.target.value as "Dni" | "Nie")}
                  className="rounded-card border border-hair bg-white px-2 py-1.5 text-[13px]">
                  <option value="Dni">DNI</option>
                  <option value="Nie">NIE</option>
                </select>
              </label>
              <label className="min-w-0 flex-1">
                <span className="mb-1 block text-[11px] font-semibold text-slate2">Documento del titular</span>
                <input value={cqDocumento} onChange={(e) => setCqDocumento(e.target.value.toUpperCase())}
                  placeholder="12345678Z" maxLength={9}
                  className="w-full rounded-card border border-hair bg-white px-3 py-1.5 text-[13px] uppercase tnums" />
              </label>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-slate2">
              Obligatorio para tarificar. Déjalo vacío solo si el lead ya tiene DNI/NIE guardado.
            </p>
            {cqError && <p className="mt-2 text-[12px] text-brand-red-deep">{cqError}</p>}
            {cqQuotes.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1.5">
                {cqQuotes.map((q) => (
                  <li key={q.id}>
                    <button type="button" onClick={() => pickCodeoscopicQuote(q)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-hair bg-white px-3 py-2 text-left text-[13px] transition-colors hover:bg-mist">
                      <span className="min-w-0 truncate text-ink">
                        {q.compania}{q.modalidad ? ` · ${q.modalidad}` : ""}
                        {q.estimate && <span className="ml-1 text-[11px] text-slate2">(estimado)</span>}
                      </span>
                      <span className="shrink-0 tnums font-semibold text-navy">
                        {q.premium != null ? `${q.premium.toFixed(2)} €/mes` : "…"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-3">
          <label>
            <span className="mb-1 block text-[12px] font-semibold text-ink">Aseguradora</span>
            <input value={compania} onChange={(e) => setCompania(e.target.value)}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
          </label>
          <label>
            <span className="mb-1 block text-[12px] font-semibold text-ink">Precio (€/mes)</span>
            <input inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value.replace(/[^\d.]/g, ""))}
              className="w-full max-w-[160px] rounded-card border border-hair bg-white px-3 py-2 text-[14px] tnums" />
          </label>
          <label>
            <span className="mb-1 block text-[12px] font-semibold text-ink">Servicios incluidos (uno por línea)</span>
            <textarea value={servicios} onChange={(e) => setServicios(e.target.value)} rows={4}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
          </label>
          <label>
            <span className="mb-1 block text-[12px] font-semibold text-ink">Condiciones</span>
            <textarea value={condiciones} onChange={(e) => setCondiciones(e.target.value)} rows={3}
              className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
          </label>
        </div>

        {error && <p role="alert" className="mt-3 text-[13px] font-medium text-brand-red">{error}</p>}

        <button onClick={submit} disabled={saving}
          className="mt-5 flex w-full items-center justify-center rounded-card bg-navy px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40">
          {saving ? "Creando…" : "Crear presupuesto"}
        </button>
      </div>
    </div>
  );
}
