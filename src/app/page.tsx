import Link from "next/link";
import { groupedTools, tools, type Tool, type ToolIcon } from "@/lib/tools";

const iconPaths: Record<ToolIcon, React.ReactNode> = {
  merge: <><path d="M7 3v5a4 4 0 0 0 4 4h2" /><path d="m10 9 3 3-3 3" /><path d="M17 21v-5a4 4 0 0 0-4-4h-2" /><path d="m14 15 3-3-3-3" /></>,
  split: <><path d="M7 3v5a4 4 0 0 0 4 4h2" /><path d="m10 9 3 3-3 3" /><path d="M17 21v-5a4 4 0 0 1 4-4" /><path d="m18 9 3 3-3 3" /></>,
  extract: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /><path d="m9 9 2 2 2-2" /></>,
  rotate: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>,
  organize: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
  "image-to-pdf": <><rect x="3" y="4" width="13" height="16" rx="2" /><path d="m5 16 4-4 3 3 2-2 2 2" /><circle cx="8" cy="9" r="1" /><path d="M19 8h2v13H9v-1" /></>,
  "pdf-to-image": <><rect x="8" y="3" width="13" height="16" rx="2" /><path d="M3 7v14h13M10 14l3-3 2 2 2-2 4 4" /><circle cx="13" cy="8" r="1" /></>,
  "page-numbers": <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 14h3M8 18h3" /><path d="M16 14v5m-1 0h2" /></>,
  watermark: <><path d="M12 3 3 7.5v9L12 21l9-4.5v-9z" /><path d="m3.5 7.7 8.5 4.5 8.5-4.5M12 21v-8.8" /><path d="m8 6 8 12" /></>,
  sign: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /><path d="M4 21h16" /></>,
  compress: <><path d="m8 3-5 5h4v4h4V8h4l-5-5zM16 21l5-5h-4v-4h-4v4H9z" /></>,
};

function ToolCard({ slug, name, description, icon }: Tool) {
  return (
    <li>
      <Link href={`/tools/${slug}`} className="tool-card">
        <svg
          aria-hidden="true"
          className="size-5 shrink-0 text-teal-800"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.65"
          viewBox="0 0 24 24"
        >
          {iconPaths[icon]}
        </svg>
        <span>
          <span className="block text-sm font-semibold text-stone-900">{name}</span>
          <span className="mt-1 block text-xs leading-4 text-stone-600">{description}</span>
        </span>
      </Link>
    </li>
  );
}

export default function Home() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-7xl px-5 pb-6 sm:px-8 lg:px-10">
      <section aria-labelledby="home-title" className="py-6 sm:py-7">
        <h1 id="home-title" className="text-3xl font-semibold tracking-tight text-stone-900">
          PDF tools. No uploads.
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Free PDF tools for your browser, with files kept on your device. Merge PDF is ready; more tools are coming soon.
        </p>
      </section>

      <section aria-labelledby="toolbox-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="toolbox-title" className="text-sm font-semibold text-stone-900">Choose a tool</h2>
          <p className="text-xs text-stone-500">
            {tools.length} tools · {tools.filter((tool) => tool.available).length} ready
          </p>
        </div>
        <div className="space-y-3">
          {groupedTools.map(({ group, tools: entries }) => (
            <section
              aria-labelledby={`group-${group.toLowerCase()}`}
              className="tool-group"
              key={group}
            >
              <h3 id={`group-${group.toLowerCase()}`} className="tool-group-title">{group}</h3>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {entries.map((tool) => <ToolCard key={tool.slug} {...tool} />)}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
