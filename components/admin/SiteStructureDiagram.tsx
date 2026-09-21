"use client";

import type { SiteNode, SiteNodeKind } from "@/lib/siteStructure";

// Diagrama de cajas anidadas (sin librería de diagramas: cajas Tailwind con
// borde-guía a la izquierda, como un árbol de archivos) — pensado para poder
// entender de un vistazo la jerarquía página padre → página hija → sección,
// y dónde encajan los 4 tarificadores. Misma fuente de datos que el resto
// del portal, ver lib/siteStructure.ts.

const KIND_LABELS: Record<SiteNodeKind, string> = {
  grupo: "Grupo", pagina: "Página", tarificador: "Tarificador", seccion: "Sección",
};

const KIND_STYLES: Record<SiteNodeKind, { box: string; title: string; badge: string; path: string; funcion: string; guide: string }> = {
  grupo: {
    box: "bg-navy border-navy", title: "text-white", badge: "bg-white/15 text-white",
    path: "text-white/70", funcion: "text-white/85", guide: "border-white/25",
  },
  pagina: {
    box: "bg-white border-hair", title: "text-navy", badge: "bg-navy/10 text-navy",
    path: "text-slate2", funcion: "text-slate2", guide: "border-hair",
  },
  tarificador: {
    box: "bg-brand-red/5 border-brand-red/30", title: "text-brand-red-deep", badge: "bg-brand-red/10 text-brand-red-deep",
    path: "text-slate2", funcion: "text-slate2", guide: "border-brand-red/20",
  },
  seccion: {
    box: "bg-mist border-hair", title: "text-ink", badge: "bg-slate2/15 text-slate2",
    path: "text-slate2", funcion: "text-slate2", guide: "border-hair",
  },
};

function Box({ node, path }: { node: SiteNode; path: string }) {
  const s = KIND_STYLES[node.kind];
  return (
    <div className={`rounded-card border p-3.5 ${s.box}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className={`text-[13.5px] font-bold ${s.title}`}>{node.label}</p>
        <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold ${s.badge}`}>{KIND_LABELS[node.kind]}</span>
      </div>
      {node.path && <p className={`mt-0.5 break-words font-mono text-[11px] ${s.path}`}>{node.path}</p>}
      <p className={`mt-1.5 text-[12px] leading-relaxed ${s.funcion}`}>{node.funcion}</p>
      {node.children && node.children.length > 0 && (
        <div className={`mt-3 flex flex-col gap-2.5 border-l-2 pl-3.5 ${s.guide}`}>
          {node.children.map((c, i) => (
            <Box key={`${path}-${i}-${c.label}`} node={c} path={`${path}-${i}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function Legend() {
  const kinds: SiteNodeKind[] = ["grupo", "pagina", "tarificador", "seccion"];
  return (
    <div className="flex flex-wrap gap-2 rounded-card border border-hair bg-white p-3">
      <span className="text-[11px] font-semibold text-slate2">Leyenda:</span>
      {kinds.map((k) => {
        const s = KIND_STYLES[k];
        return (
          <span key={k} className={`rounded-pill border px-2.5 py-1 text-[11px] font-semibold ${s.box} ${s.title}`}>
            {KIND_LABELS[k]}
          </span>
        );
      })}
    </div>
  );
}

export function SiteStructureDiagram({ nodes }: { nodes: SiteNode[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Legend />
      <div className="flex flex-col gap-4">
        {nodes.map((n, i) => (
          <Box key={`${i}-${n.label}`} node={n} path={String(i)} />
        ))}
      </div>
    </div>
  );
}
