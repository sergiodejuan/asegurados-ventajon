"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { ArrowRight } from "@/components/icons";

const SECTIONS = [
  { href: "/admin/diseno/colores", title: "Colores", description: "Paleta de marca: azul marino, rojo de acento, textos y fondos." },
  { href: "/admin/diseno/tipografia", title: "Tipografías", description: "Fuente de titulares y de texto general de toda la web." },
  { href: "/admin/diseno/logos", title: "Logos y favicon", description: "Logo del menú, logo de páginas sin salida y el icono de la pestaña." },
  { href: "/admin/diseno/portadas", title: "Fotos de portada (H1)", description: "Imagen de cabecera de la home y de cada página de producto." },
  { href: "/admin/diseno/aseguradoras", title: "Aseguradoras aliadas", description: "Logos de las compañías que se muestran junto al nombre." },
  { href: "/admin/diseno/loader", title: "Loader entre páginas", description: "Pantalla de marca al navegar entre páginas generales." },
  { href: "/admin/diseno/home-hero", title: "Hero de la portada (Home)", description: "Etiqueta, titular, subtítulo y botones de la cabecera de la home." },
  { href: "/admin/diseno/widget-auto", title: "Widget de seguro de auto", description: "Tarjeta flotante de captación en la home (solo escritorio)." },
];

export default function AdminDisenoPage() {
  return (
    <AdminShell active="diseno">
      <main className="mx-auto max-w-2xl px-5 py-6">
        <h1 className="text-[22px] font-extrabold text-navy">Diseño</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-slate2">
          Apariencia y contenido visual del sitio, por bloques. Cada sección se guarda por separado, sin afectar a las demás.
          El módulo de cookies y el seguimiento (GTM/GA4) se configuran en{" "}
          <a href="/admin/configuracion/cookies" className="font-semibold text-navy underline">Configuración</a>.
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          {SECTIONS.map((s) => (
            <a key={s.href} href={s.href}
              className="flex items-center justify-between gap-3 rounded-card border border-hair bg-white px-4 py-3.5 transition-colors hover:bg-mist">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">{s.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-slate2">{s.description}</p>
              </div>
              <ArrowRight width={17} height={17} className="shrink-0 text-brand-red" />
            </a>
          ))}
        </div>
      </main>
    </AdminShell>
  );
}
