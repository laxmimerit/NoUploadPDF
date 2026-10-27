"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PrivacyPill } from "@/components/privacy-pill";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Tool } from "@/lib/tools";

type ToolGroup = { group: string; tools: Tool[] };

export function ToolNavigation({ groups }: { groups: ToolGroup[] }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  function close() {
    setOpenGroup(null);
    setMenuOpen(false);
  }

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node
        && !navigation.current?.querySelector("nav")?.contains(event.target)
        && !menuButton.current?.contains(event.target)) close();
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const media = matchMedia("(min-width: 761px)");
    const resize = () => { if (media.matches) close(); };
    media.addEventListener("change", resize);
    return () => {
      document.body.style.overflow = previous;
      media.removeEventListener("change", resize);
    };
  }, [menuOpen]);

  return (
    <div className="header-controls" ref={navigation} onKeyDown={(event) => {
      if (event.key === "Escape" && menuOpen) {
        event.preventDefault();
        close();
        menuButton.current?.focus();
      }
      if (event.key === "Tab" && menuOpen && matchMedia("(max-width: 760px)").matches) {
        const focusable = Array.from(navigation.current?.querySelectorAll<HTMLElement>("a, button") ?? [])
          .filter((element) => element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <nav aria-label="Main navigation" className={`site-navigation ${menuOpen ? "is-open" : ""}`}
        id="main-navigation">
        <div className="mobile-privacy"><PrivacyPill /></div>
        {groups.map(({ group, tools }, index) => {
          const expanded = openGroup === group;
          const panelId = `tool-menu-${index}`;
          return (
            <div className="navigation-group" key={group} onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setOpenGroup(null);
            }} onKeyDown={(event) => {
              if (event.key === "Escape" && expanded) {
                event.preventDefault();
                event.stopPropagation();
                setOpenGroup(null);
                event.currentTarget.querySelector("button")?.focus();
              }
            }}>
              <button aria-controls={panelId} aria-expanded={expanded} className="navigation-trigger"
                onClick={() => setOpenGroup(expanded ? null : group)} type="button">
                {group}
                <svg aria-hidden="true" width="12" height="12" fill="none" viewBox="0 0 12 12">
                  <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
                </svg>
              </button>
              <ul className="navigation-dropdown" hidden={!expanded} id={panelId}>
                {tools.map((tool) => (
                  <li key={tool.slug}>
                    <Link href={`/tools/${tool.slug}`} aria-label={tool.name} onClick={close}>
                      <span className="navigation-tool-name">{tool.name}</span>
                      <span className="navigation-description">{tool.description}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <Link className="navigation-trigger" href="/about" onClick={close}>About</Link>
      </nav>
      <div className="desktop-privacy"><PrivacyPill /></div>
      <ThemeToggle />
      <button className={`menu-toggle ${menuOpen ? "is-open" : ""}`} type="button" ref={menuButton}
        aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}
        aria-controls="main-navigation" onClick={() => { setMenuOpen(!menuOpen); setOpenGroup(null); }}>
        <span /><span /><span />
      </button>
    </div>
  );
}
