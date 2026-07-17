"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";

const WORK_DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes"] as const;
type WorkDay = (typeof WORK_DAYS)[number];
const WORK_DAY_LABELS: Record<WorkDay, string> = { lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves", viernes: "Viernes" };
type DayShift = { manana: boolean; tarde: boolean };
type Availability = Record<WorkDay, DayShift>;

function emptyAvailability(): Availability {
  return { lunes: { manana: false, tarde: false }, martes: { manana: false, tarde: false }, miercoles: { manana: false, tarde: false }, jueves: { manana: false, tarde: false }, viernes: { manana: false, tarde: false } };
}

type Agent = {
  id: string; nombre: string; email: string; fotoUrl: string; rol: "admin" | "agente";
  permisos: string[]; disponibilidad: Availability; activo: boolean; lastLoginAt: string;
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTO_SIZE = 200;

function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      img.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_SIZE / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(reader.result as string); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function AdminAgentesPage() {
  return (
    <AdminShell active="agentes">
      <AgentesAdmin />
    </AdminShell>
  );
}

function AgentesAdmin() {
  const { token } = useAdminToken();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/agentes", { headers: { "x-admin-token": token } });
      const body = await res.json();
      if (!res.ok || !body.ok) { setError(body.error ?? "No se pudo cargar."); setLoading(false); return; }
      setAgents(body.agents);
    } catch { setError("Error de conexión."); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function save(id: string, patch: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/admin/agentes/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-token": token }, body: JSON.stringify(patch),
    });
    const body = await res.json();
    if (res.ok && body.ok) { setAgents((prev) => prev.map((a) => (a.id === id ? body.agent : a))); return true; }
    setError(body.error ?? "No se pudo guardar.");
    return false;
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar a este agente? No podrá volver a entrar al panel.")) return;
    const res = await fetch(`/api/admin/agentes/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (res.ok) { setAgents((prev) => prev.filter((a) => a.id !== id)); if (editingId === id) setEditingId(null); }
  }

  async function createNew(input: { nombre: string; email: string; password: string }): Promise<boolean> {
    setError(null);
    const res = await fetch("/api/admin/agentes", {
      method: "POST", headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ ...input, rol: "agente", permisos: [], disponibilidad: emptyAvailability(), activo: true }),
    });
    const body = await res.json();
    if (res.ok && body.ok) { setAgents((prev) => [body.agent, ...prev]); setCreating(false); setEditingId(body.agent.id); return true; }
    setError(body.error ?? "No se pudo crear el agente.");
    return false;
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-6">
      <h1 className="text-[22px] font-extrabold text-navy">Agentes</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">
        Alta del equipo comercial, foto, y disponibilidad (días y turnos). Esa disponibilidad es la que alimenta los huecos que se ofrecen a los clientes al elegir cuándo quieren que les llamen. Los permisos de cada agente se gestionan en <a href="/admin/permisos" className="font-semibold text-navy underline">Permisos</a>.
      </p>

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      <ul className="mt-4 flex flex-col gap-3">
        {agents.map((a) => (
          <li key={a.id} className="rounded-card border border-hair bg-white p-4 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {a.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.fotoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-navy/10 text-[14px] font-bold text-navy">
                    {a.nombre.trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="text-[15px] font-bold text-ink">{a.nombre}</p>
                  <p className="text-[12px] text-slate2">{a.email}</p>
                </div>
                {a.rol === "admin" && <span className="rounded-pill bg-navy/10 px-2 py-0.5 text-[11px] font-bold text-navy">Admin</span>}
                {!a.activo && <span className="rounded-pill bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">Inactivo</span>}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setEditingId(editingId === a.id ? null : a.id)}
                className="rounded-pill border border-hair bg-white px-3 py-1 text-[12px] font-semibold text-navy transition-colors hover:bg-mist">
                {editingId === a.id ? "Cerrar edición" : "Editar"}
              </button>
              <button onClick={() => save(a.id, { activo: !a.activo })}
                className={`rounded-pill px-3 py-1 text-[12px] font-semibold transition-colors ${a.activo ? "border border-hair bg-white text-navy hover:bg-mist" : "bg-navy text-white"}`}>
                {a.activo ? "Desactivar" : "Activar"}
              </button>
              <button onClick={() => remove(a.id)}
                className="ml-auto rounded-pill px-3 py-1 text-[12px] font-semibold text-brand-red transition-colors hover:bg-brand-red/10">
                Eliminar
              </button>
            </div>

            {editingId === a.id && <AgentEditor agent={a} onSave={(patch) => save(a.id, patch)} />}
          </li>
        ))}
      </ul>

      {creating ? (
        <NewAgentForm onCreate={createNew} onCancel={() => setCreating(false)} />
      ) : (
        <button onClick={() => setCreating(true)}
          className="mt-4 flex w-full items-center justify-center rounded-card border border-dashed border-hair px-5 py-3.5 text-[14px] font-semibold text-navy transition-colors hover:bg-mist">
          + Añadir agente
        </button>
      )}
    </main>
  );
}

function AgentEditor({ agent, onSave }: { agent: Agent; onSave: (patch: Record<string, unknown>) => Promise<boolean> }) {
  const [nombre, setNombre] = useState(agent.nombre);
  const [email, setEmail] = useState(agent.email);
  const [password, setPassword] = useState("");
  const [fotoUrl, setFotoUrl] = useState(agent.fotoUrl);
  const [disponibilidad, setDisponibilidad] = useState<Availability>(agent.disponibilidad);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    if (file.size > MAX_PHOTO_BYTES) { setPhotoError("El archivo pesa demasiado. Usa uno de menos de 5 MB."); return; }
    setProcessingPhoto(true);
    try { setFotoUrl(await resizePhoto(file)); }
    catch { setPhotoError("No se pudo procesar la imagen."); }
    setProcessingPhoto(false);
  }

  function toggleShift(day: WorkDay, turno: keyof DayShift) {
    setDisponibilidad((prev) => ({ ...prev, [day]: { ...prev[day], [turno]: !prev[day][turno] } }));
  }

  async function handleSave() {
    setSaving(true); setSaved(false);
    const patch: Record<string, unknown> = { nombre, email, fotoUrl, disponibilidad };
    if (password.trim()) patch.password = password.trim();
    const ok = await onSave(patch);
    setSaving(false);
    if (ok) { setPassword(""); setSaved(true); setTimeout(() => setSaved(false), 1800); }
  }

  return (
    <div className="mt-4 flex flex-col gap-4 rounded-card border border-hair bg-mist p-4">
      <label className="block">
        <span className="mb-1 block text-[12px] font-semibold text-ink">Foto</span>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {fotoUrl && <img src={fotoUrl} alt="" className="h-12 w-12 rounded-full border border-hair object-cover" />}
          <input ref={fileRef} type="file" accept="image/*" onChange={onPhotoChange} className="text-[13px]" />
          {processingPhoto && <span className="text-[12px] text-slate2">Procesando…</span>}
        </div>
        {fotoUrl && (
          <button type="button" onClick={() => { setFotoUrl(""); if (fileRef.current) fileRef.current.value = ""; }}
            className="mt-1.5 text-[12px] font-semibold text-brand-red underline">
            Quitar foto
          </button>
        )}
        {photoError && <p role="alert" className="mt-1.5 text-[12px] font-medium text-brand-red">{photoError}</p>}
      </label>

      <div className="flex flex-wrap gap-3">
        <label className="flex-1">
          <span className="mb-1 block text-[12px] font-semibold text-ink">Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-[12px] font-semibold text-ink">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
        </label>
      </div>

      <label>
        <span className="mb-1 block text-[12px] font-semibold text-ink">Nueva contraseña <span className="font-normal text-slate2">(déjalo en blanco para no cambiarla)</span></span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres…"
          className="w-full max-w-xs rounded-card border border-hair bg-white px-3 py-2 text-[14px]" />
      </label>

      <div>
        <p className="mb-2 text-[12px] font-semibold text-ink">Disponibilidad (días y turnos que trabaja)</p>
        <p className="mb-2 text-[11px] text-slate2">Se usa para calcular los huecos que se ofrecen a los clientes al pedir que les llamen.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-slate2">
                <th className="pb-1 pr-3 font-semibold">Día</th>
                <th className="pb-1 pr-3 font-semibold">Mañana</th>
                <th className="pb-1 font-semibold">Tarde</th>
              </tr>
            </thead>
            <tbody>
              {WORK_DAYS.map((d) => (
                <tr key={d} className="border-t border-hair">
                  <td className="py-1.5 pr-3 font-medium text-ink">{WORK_DAY_LABELS[d]}</td>
                  <td className="py-1.5 pr-3">
                    <input type="checkbox" checked={disponibilidad[d].manana} onChange={() => toggleShift(d, "manana")} className="h-4 w-4 cursor-pointer accent-navy" />
                  </td>
                  <td className="py-1.5">
                    <input type="checkbox" checked={disponibilidad[d].tarde} onChange={() => toggleShift(d, "tarde")} className="h-4 w-4 cursor-pointer accent-navy" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center justify-center rounded-card bg-navy px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40">
        {saving ? "Guardando…" : saved ? "Guardado ✓" : "Guardar cambios"}
      </button>
    </div>
  );
}

function NewAgentForm({ onCreate, onCancel }: { onCreate: (input: { nombre: string; email: string; password: string }) => Promise<boolean>; onCancel: () => void }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = nombre.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 8;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    await onCreate({ nombre: nombre.trim(), email: email.trim(), password });
    setSubmitting(false);
  }

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-card border border-hair bg-white p-4">
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellidos…"
        className="rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]" />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email…"
        className="rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mínimo 8 caracteres)…"
        className="rounded-card border border-hair bg-white px-4 py-2.5 text-[14px]" />
      <div className="flex gap-2">
        <button onClick={submit} disabled={!canSubmit || submitting}
          className="flex-1 rounded-card bg-navy px-4 py-2.5 text-[14px] font-semibold text-white disabled:bg-slate2/40">
          {submitting ? "Creando…" : "Crear agente"}
        </button>
        <button onClick={onCancel} className="rounded-card border border-hair px-4 py-2.5 text-[14px] font-semibold text-navy hover:bg-mist">
          Cancelar
        </button>
      </div>
    </div>
  );
}
