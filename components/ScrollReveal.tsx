"use client";

import { useEffect, useRef, useState } from "react";

// Micro-animación de scrollytelling: cada bloque envuelto aquí entra con un
// leve desplazamiento + fundido cuando cruza el viewport, en vez de mostrarse
// de golpe — así la página de una historia se lee como un relato que avanza
// contigo, no como una landing estática. Una vez visible, se queda así (no
// se oculta de nuevo al subir el scroll): es una revelación, no un efecto de
// scroll infinito. Respeta prefers-reduced-motion vía "motion-safe".
export function ScrollReveal({
  children, className = "", delayMs = 0,
}: { children: React.ReactNode; className?: string; delayMs?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out ${
        visible ? "opacity-100 translate-y-0" : "motion-safe:opacity-0 motion-safe:translate-y-8"
      } ${className}`}
      style={visible ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
