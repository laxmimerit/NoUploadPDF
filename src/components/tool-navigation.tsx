"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Tool } from "@/lib/tools";

type ToolGroup = { group: string; tools: Tool[] };

export function ToolNavigation({ groups }: { groups: ToolGroup[] }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navigation = useRef<HTMLElement>(null);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !navigation.current?.contains(event.target)) {
        setOpenGroup(null);
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  return (
    <nav aria-label="Main navigation" className="site-navigation" ref={navigation}>
      {groups.map(({ group, tools }, index) => {
        const expanded = openGroup === group;
        const panelId = `tool-menu-${index}`;

        return (
          <div
            className="navigation-group"
            key={group}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setOpenGroup(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && expanded) {
                event.preventDefault();
                setOpenGroup(null);
                event.currentTarget.querySelector("button")?.focus();
              }
            }}
          >
            <button
              aria-controls={panelId}
              aria-expanded={expanded}
              className="navigation-trigger"
              onClick={() => setOpenGroup(expanded ? null : group)}
              type="button"
            >
              {group}
              <svg aria-hidden="true" className="size-3" fill="none" viewBox="0 0 12 12">
                <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
            </button>
            <ul className="navigation-dropdown" hidden={!expanded} id={panelId}>
              {tools.map((tool) => (
                <li key={tool.slug}>
                  <Link href={`/tools/${tool.slug}`} onClick={() => setOpenGroup(null)}>
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <Link className="navigation-trigger" href="/about" onClick={() => setOpenGroup(null)}>About</Link>
    </nav>
  );
}
