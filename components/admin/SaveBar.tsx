"use client";

export function SaveBar({
  saving, saved, onSave, disabled,
}: { saving: boolean; saved: boolean; onSave: () => void; disabled?: boolean }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hair bg-white/95 px-5 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-end gap-3">
        <button onClick={onSave} disabled={saving || disabled}
          className="flex items-center justify-center rounded-card bg-navy px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:bg-slate2/40">
          {saving ? "Guardando…" : saved ? "Guardado ✓" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
