"use client";

export function IntegracionesSectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <>
      <a href="/admin/integraciones" className="text-[13px] font-semibold text-navy">← Integraciones</a>
      <h1 className="mt-2 text-[22px] font-extrabold text-navy">{title}</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-slate2">{description}</p>
    </>
  );
}
