"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<string>();

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    function sync() {
      let saved;
      try { saved = localStorage.getItem("theme"); } catch {}
      const next = saved === "light" || saved === "dark" ? saved : media.matches ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      setTheme(next);
    }
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <button className="theme-toggle" type="button" aria-label="Toggle color theme" aria-pressed={theme === "dark"}
      onClick={() => {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        setTheme(next);
        try { localStorage.setItem("theme", next); } catch {}
      }}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <g className="sun-icon">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </g>
        <path className="moon-icon" d="M20.5 13a8.5 8.5 0 0 1-9.5-9.5A8.5 8.5 0 1 0 20.5 13Z" />
      </svg>
    </button>
  );
}
