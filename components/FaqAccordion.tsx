import { ChevronDown } from "./icons";

export type FaqItem = { q: string; a: string };

export function FaqAccordion({
  heading = "Preguntas frecuentes",
  items,
}: {
  heading?: string;
  items: FaqItem[];
}) {
  return (
    <section aria-labelledby="faq" className="mx-auto mt-14 max-w-app px-5 md:mt-24 md:max-w-3xl">
      <h2 id="faq" className="text-[22px] font-extrabold text-navy md:text-[26px]">{heading}</h2>
      <div className="mt-5 flex flex-col gap-2">
        {items.map((f) => (
          <details key={f.q} className="group rounded-card border border-hair bg-white px-5 py-4 open:shadow-soft">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-ink marker:content-none">
              {f.q}
              <span aria-hidden="true" className="shrink-0 text-navy transition-transform group-open:rotate-180">
                <ChevronDown width={18} height={18} />
              </span>
            </summary>
            <p className="mt-3 text-[14px] leading-relaxed text-slate2">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
