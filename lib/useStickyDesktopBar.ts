"use client";

import { useEffect, useRef, useState } from "react";

// Lógica compartida entre las distintas barras rojas fijas de escritorio
// (promoción, ramo de producto, home): se muestran al perder de vista un
// elemento "trigger" del hero (los CTA de verdad), y mientras están visibles
// empujan hacia arriba el botón del asistente (ver AssistantWidget) vía una
// variable CSS, para no quedar tapadas ni taparlo.
export function useStickyDesktopBar(targetId: string) {
  const [visible, setVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  useEffect(() => {
    const height = visible ? barRef.current?.offsetHeight ?? 0 : 0;
    document.documentElement.style.setProperty("--assistant-bottom", height ? `${height + 24}px` : "1.5rem");
    return () => { document.documentElement.style.setProperty("--assistant-bottom", "1.5rem"); };
  }, [visible]);

  return { visible, barRef };
}
