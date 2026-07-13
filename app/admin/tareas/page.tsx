"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell, useAdminToken } from "@/components/admin/AdminShell";

type Task = {
  id: string; leadId: string; presupuestoId: string; titulo: string; notas: string;
  fecha: string; hora: string; agente: string; completada: boolean; completedAt: string;
};
type LeadOption = { id: string; nombre: string; telefono: string };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminTareasPage() {
  return (
    <AdminShell active="tareas">
      <TareasAdmin />
    </AdminShell>
  );
}

function TareasAdmin() {
  const { token, agent } = useAdminToken();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [tRes, lRes] = await Promise.all([
      fetch("/api/admin/tasks", { headers: { "x-admin-token": token } }),
      fetch("/api/admin/leads", { headers: { "x-admin-token": token } }),
    ]);
    const tBody = await tRes.json();
    const lBody = await lRes.json();
    if (tBody.ok) setTasks(tBody.tasks);
    if (lBody.ok) setLeads(lBody.leads);
    setLoaded(true);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function toggle(id: string, completada: boolean) {
    await fetch(`/api/admin/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ completada }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/tasks/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    load();
  }

  const leadById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);

  const groups = useMemo(() => {
    const today = todayIso();
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const in7iso = in7.toISOString().slice(0, 10);

    const pending = tasks.filter((t) => !t.completada).sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
    const completed = tasks.filter((t) => t.completada);

    return {
      vencidas: pending.filter((t) => t.fecha < today),
      hoy: pending.filter((t) => t.fecha === today),
      proximos: pending.filter((t) => t.fecha > today && t.fecha <= in7iso),
      masAdelante: pending.filter((t) => t.fecha > in7iso),
      completadas: completed.sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    };
  }, [tasks]);

  if (!loaded) {
    return <main className="mx-auto max-w-3xl px-5 py-10 text-center text-[14px] text-slate2">Cargando…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold text-navy">Tareas y agenda</h1>
        <button onClick={() => setCreating((c) => !c)} className="rounded-pill bg-navy px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-deep">
          {creating ? "Cerrar" : "+ Nueva tarea"}
        </button>
      </div>

      {creating && (
        <NewTaskForm token={token} agent={agent} leads={leads} onCreated={() => { setCreating(false); load(); }} />
      )}

      <div className="mt-6 flex flex-col gap-6">
        <TaskGroup title="Vencidas" tone="text-brand-red" items={groups.vencidas} leadById={leadById} onToggle={toggle} onDelete={remove} />
        <TaskGroup title="Hoy" tone="text-navy" items={groups.hoy} leadById={leadById} onToggle={toggle} onDelete={remove} />
        <TaskGroup title="Próximos 7 días" tone="text-ink" items={groups.proximos} leadById={leadById} onToggle={toggle} onDelete={remove} />
        <TaskGroup title="Más adelante" tone="text-ink" items={groups.masAdelante} leadById={leadById} onToggle={toggle} onDelete={remove} />

        <div>
          <button onClick={() => setShowCompleted((s) => !s)} className="text-[13px] font-semibold text-navy underline">
            {showCompleted ? "Ocultar" : "Ver"} completadas ({groups.completadas.length})
          </button>
          {showCompleted && (
            <div className="mt-3">
              <TaskGroup title="" tone="text-slate2" items={groups.completadas} leadById={leadById} onToggle={toggle} onDelete={remove} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function TaskGroup({
  title, tone, items, leadById, onToggle, onDelete,
}: {
  title: string; tone: string; items: Task[]; leadById: Map<string, LeadOption>;
  onToggle: (id: string, completada: boolean) => void; onDelete: (id: string) => void;
}) {
  if (items.length === 0 && !title) return null;
  return (
    <section>
      {title && <h2 className={`text-[14px] font-bold ${tone}`}>{title} ({items.length})</h2>}
      {items.length === 0 ? (
        <p className="mt-2 text-[13px] text-slate2">Nada por aquí.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((t) => {
            const lead = t.leadId ? leadById.get(t.leadId) : undefined;
            return (
              <li key={t.id} className="flex items-start gap-3 rounded-card border border-hair bg-white p-3.5">
                <input type="checkbox" checked={t.completada} onChange={(e) => onToggle(t.id, e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-navy" />
                <div className="min-w-0 flex-1">
                  <p className={`text-[14px] font-medium ${t.completada ? "text-slate2 line-through" : "text-ink"}`}>{t.titulo}</p>
                  <p className="text-[12px] text-slate2 tnums">
                    {t.fecha}{t.hora ? ` · ${t.hora}` : ""}{t.agente ? ` · ${t.agente}` : ""}
                    {lead && (
                      <> · <a href={`/admin?lead=${lead.id}`} className="font-semibold text-navy underline">{lead.nombre || lead.telefono}</a></>
                    )}
                  </p>
                  {t.notas && <p className="mt-1 text-[13px] text-slate2">{t.notas}</p>}
                </div>
                <button onClick={() => onDelete(t.id)} className="shrink-0 text-[11px] font-semibold text-brand-red underline">Eliminar</button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function NewTaskForm({
  token, agent, leads, onCreated,
}: { token: string; agent: string; leads: LeadOption[]; onCreated: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(todayIso());
  const [hora, setHora] = useState("");
  const [notas, setNotas] = useState("");
  const [leadId, setLeadId] = useState("");
  const [leadQuery, setLeadQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredLeads = useMemo(() => {
    const q = leadQuery.trim().toLowerCase();
    if (!q) return leads.slice(0, 15);
    return leads.filter((l) => `${l.nombre} ${l.telefono}`.toLowerCase().includes(q)).slice(0, 15);
  }, [leads, leadQuery]);

  async function submit() {
    if (!titulo.trim() || !fecha) return;
    setSaving(true);
    await fetch("/api/admin/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ titulo, fecha, hora, notas, leadId: leadId || undefined, agente: agent }),
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-hair bg-white p-5">
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título de la tarea…"
        className="w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[14px]" />
      <div className="flex gap-3">
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
          className="rounded-card border border-hair bg-white px-3 py-2.5 text-[14px]" />
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)}
          className="rounded-card border border-hair bg-white px-3 py-2.5 text-[14px]" />
      </div>
      <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Notas (opcional)…"
        className="w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[14px]" />
      <div>
        <input value={leadQuery} onChange={(e) => setLeadQuery(e.target.value)} placeholder="Vincular a un lead (opcional)…"
          className="w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[14px]" />
        <select value={leadId} onChange={(e) => setLeadId(e.target.value)}
          className="mt-2 w-full rounded-card border border-hair bg-white px-3 py-2.5 text-[14px]">
          <option value="">— Sin vincular —</option>
          {filteredLeads.map((l) => <option key={l.id} value={l.id}>{l.nombre || "Sin nombre"} · {l.telefono}</option>)}
        </select>
      </div>
      <button onClick={submit} disabled={saving || !titulo.trim()}
        className="flex items-center justify-center rounded-card bg-navy px-5 py-2.5 text-[14px] font-semibold text-white disabled:bg-slate2/40">
        {saving ? "Creando…" : "Crear tarea"}
      </button>
    </div>
  );
}
