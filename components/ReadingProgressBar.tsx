"use client";

import { useEffect, useState } from "react";

// Barra fina de progreso de lectura (formato "long-read"): refuerza la
// sensación de estar avanzando en un relato, no navegando una landing más.
export function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-40 h-1 bg-transparent">
      <div className="h-full bg-brand-red transition-[width] duration-150 ease-out" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}
