"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { DisenoSectionHeader } from "@/components/admin/DisenoSectionHeader";
import { SaveBar } from "@/components/admin/SaveBar";
import { useThemeSection } from "@/components/admin/useThemeSection";
import { ImageField } from "@/components/admin/ImageField";

export default function AdminDisenoLogosPage() {
  return (
    <AdminShell active="diseno-logos">
      <LogosAdmin />
    </AdminShell>
  );
}

function LogosAdmin() {
  const { theme, setTheme, loading, saving, saved, error, save } = useThemeSection();

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <DisenoSectionHeader
        title="Logos y favicon"
        description="Logo del menú, logo de páginas sin salida y el icono de la pestaña del navegador."
      />

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && (
        <section className="mt-5 rounded-[20px] border border-hair bg-white p-5">
          <ImageField
            label="Logo del menú (navbar)"
            hint="Sin logo, se muestra el nombre de la marca en texto."
            value={theme.logoUrl}
            onChange={(v) => setTheme((t) => ({ ...t, logoUrl: v }))}
            maxWidth={480} mime="image/png"
            preview="h-9"
          />
          <ImageField
            label="Logo de páginas sin salida (comparativa, quiero que me llamen…)"
            hint="Si lo dejas vacío, se usa el logo del navbar; si tampoco hay, el nombre en texto."
            value={theme.minimalLogoUrl}
            onChange={(v) => setTheme((t) => ({ ...t, minimalLogoUrl: v }))}
            maxWidth={480} mime="image/png"
            preview="h-9"
          />
          <ImageField
            label="Favicon"
            hint="Icono de la pestaña del navegador. Usa una imagen cuadrada (ideal 512×512)."
            value={theme.faviconUrl}
            onChange={(v) => setTheme((t) => ({ ...t, faviconUrl: v }))}
            maxWidth={128} mime="image/png"
            preview="h-8 w-8"
          />
        </section>
      )}

      <SaveBar saving={saving} saved={saved} disabled={loading}
        onSave={() => save({ logoUrl: theme.logoUrl, minimalLogoUrl: theme.minimalLogoUrl, faviconUrl: theme.faviconUrl })} />
    </main>
  );
}
