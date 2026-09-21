"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { DisenoSectionHeader } from "@/components/admin/DisenoSectionHeader";
import { SaveBar } from "@/components/admin/SaveBar";
import { useThemeSection } from "@/components/admin/useThemeSection";
import { ImageField } from "@/components/admin/ImageField";
import { PARTNERS } from "@/lib/brand";

export default function AdminDisenoAseguradorasPage() {
  return (
    <AdminShell active="diseno-aseguradoras">
      <AseguradorasAdmin />
    </AdminShell>
  );
}

function AseguradorasAdmin() {
  const { theme, setTheme, loading, saving, saved, error, save } = useThemeSection();

  function setPartnerLogo(name: string, value: string) {
    setTheme((t) => ({ ...t, partnerLogos: { ...t.partnerLogos, [name]: value } }));
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <DisenoSectionHeader
        title="Aseguradoras aliadas (logos)"
        description={`Se muestran junto al nombre en la home y en "Quiénes somos". Sin logo, solo se ve el nombre.`}
      />

      {error && <p role="alert" className="mt-4 text-[13px] font-medium text-brand-red">{error}</p>}
      {loading && <p className="mt-4 text-[13px] text-slate2">Cargando…</p>}

      {!loading && (
        <section className="mt-5 rounded-[20px] border border-hair bg-white p-5">
          <div className="flex flex-col gap-4">
            {PARTNERS.map((name) => (
              <ImageField
                key={name}
                label={name}
                value={theme.partnerLogos[name] ?? ""}
                onChange={(v) => setPartnerLogo(name, v)}
                maxWidth={300} mime="image/png"
                preview="h-9"
              />
            ))}
          </div>
        </section>
      )}

      <SaveBar saving={saving} saved={saved} disabled={loading} onSave={() => save({ partnerLogos: theme.partnerLogos })} />
    </main>
  );
}
