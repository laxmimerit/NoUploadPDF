"use client";

import Link from "next/link";
import { useState } from "react";
import { toolGroups, tools, type Tool } from "@/lib/tools";

export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <li>
      <Link href={`/tools/${tool.slug}`} className="tool-card" aria-label={tool.name}
        aria-describedby={`${tool.slug}-status ${tool.slug}-description`}>
        <span className="card-top"><span className="eyebrow">{tool.group}</span>
          <span id={`${tool.slug}-status`} className={tool.available ? "ready-label" : "coming-label"}>
            {tool.available ? "Ready" : "Coming soon"}
          </span>
        </span>
        <span className="card-content"><span className="card-title">{tool.name}
          <span aria-hidden="true">↗</span></span>
          <span className="card-description" id={`${tool.slug}-description`}>{tool.description}</span>
        </span>
      </Link>
    </li>
  );
}

export function ToolGrid() {
  const [group, setGroup] = useState("All");
  const [query, setQuery] = useState("");
  const visible = tools.filter((tool) => (group === "All" || tool.group === group)
    && `${tool.name} ${tool.description}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <section id="tools" aria-labelledby="toolbox-title" className="toolbox container section-space">
      <div className="section-heading">
        <div><p className="eyebrow">THE TOOLBOX</p><h2 id="toolbox-title">Choose a tool</h2></div>
        <p>{tools.filter((tool) => tool.available).length} ready to use. The rest are on the way.</p>
      </div>
      <div className="tool-filters">
        <div className="filter-chips" role="group" aria-label="Filter tools by category">
          {["All", ...toolGroups].map((entry) => (
            <button type="button" className="filter-chip" key={entry} aria-pressed={group === entry}
              onClick={() => setGroup(entry)}>
              {entry} <span>
                {entry === "All" ? tools.length : tools.filter((tool) => tool.group === entry).length}
              </span>
            </button>
          ))}
        </div>
        <label className="tool-search">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg>
          <span className="sr-only">Search tools</span>
          <input type="search" placeholder="Search tools…" value={query}
            onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>
      <ul className="tool-grid">{visible.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}</ul>
      <p role="status" className="filter-status">
        {visible.length === 0 ? "No tools match. Try another search or category." : `${visible.length} tools shown`}
      </p>
    </section>
  );
}
