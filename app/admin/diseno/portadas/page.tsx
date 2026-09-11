"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { DisenoSectionHeader } from "@/components/admin/DisenoSectionHeader";
import { SaveBar } from "@/components/admin/SaveBar";
import { useThemeSection } from "@/components/admin/useThemeSection";
import { ImageField } from "@/components/admin/ImageField";
import { HERO_PAGE_KEYS } from "@/lib/theme";

export default function AdminDisenoPortadasPage() {
  return (
    <AdminShell active="diseno-portadas">
      <PortadasAdmin />
    </AdminShell>
  );
}

function PortadasAdmin() {
  const { theme, setTheme, loading, saving, saved, error, save } = useThemeSection();

  function setHero(key: string, value: string) {
    setTheme((t) => ({ ...t, heroImages: { ...t.heroImages, [key]: value } }));
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <DisenoSectionHeader
        title="Fotos de portada (H1)"
        description="Imagen de cabecera de la home y de cada página de producto. Sin foto, se muestra el fondo de marca con icono."
      />

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && (
        <section className="mt-5 rounded-[20px] border border-hair bg-white p-5">
          <div className="flex flex-col gap-4">
            {HERO_PAGE_KEYS.map((p) => (
              <ImageField
                key={p.key}
                label={p.label}
                value={theme.heroImages[p.key] ?? ""}
                onChange={(v) => setHero(p.key, v)}
                maxWidth={1400} mime="image/jpeg"
                preview="h-20 w-32"
                wide
              />
            ))}
          </div>
        </section>
      )}

      <SaveBar saving={saving} saved={saved} disabled={loading} onSave={() => save({ heroImages: theme.heroImages })} />
    </main>
  );
}
