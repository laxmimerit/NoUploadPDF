import { toolGroups, tools, type ToolIcon } from "@/lib/tools";

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

function ToolCard({ name, description, icon }: (typeof tools)[number]) {
  return (
    <article className="group relative flex min-h-[190px] flex-col rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(27,50,45,0.025)] transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-[0_12px_30px_rgba(27,50,45,0.08)] sm:p-6">
      <div className="mb-6 flex items-start justify-between">
        <span className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-800 ring-1 ring-teal-900/5 transition group-hover:bg-teal-100">
          <svg aria-hidden="true" className="size-[21px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.65" viewBox="0 0 24 24">
            {iconPaths[icon]}
          </svg>
        </span>
        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold tracking-[0.04em] text-stone-500">Coming soon</span>
      </div>
      <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-stone-900">{name}</h3>
      <p className="mt-1.5 max-w-[26ch] text-[13px] leading-5 text-stone-500">{description}</p>
    </article>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fafaf8] text-stone-900">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a aria-label="NoUploadPDF home" className="flex items-center gap-2.5" href="#top">
          <span className="flex size-9 items-center justify-center rounded-xl bg-teal-800 text-white shadow-sm shadow-teal-900/15">
            <svg aria-hidden="true" className="size-[19px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3.75h6.5L19 9.25v10A1.75 1.75 0 0 1 17.25 21h-10A1.75 1.75 0 0 1 5.5 19.25V5.5A1.75 1.75 0 0 1 7.25 3.75Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M13 4v5.5h5.5M8.5 14.5h7M8.5 17.5h4"/></svg>
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.04em]">NoUpload<span className="text-teal-800">PDF</span></span>
        </a>
        <div className="hidden items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-3.5 py-2 text-xs font-medium text-stone-600 sm:flex">
          <span className="size-1.5 rounded-full bg-emerald-500" /> Private by design
        </div>
      </header>

      <section id="top" className="relative mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:px-12 lg:pt-20">
        <div aria-hidden="true" className="pointer-events-none absolute -right-56 -top-36 -z-0 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(192,222,211,0.34)_0%,rgba(250,250,248,0)_68%)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-teal-900/10 bg-white/75 px-3.5 py-1.5 text-[11px] font-medium tracking-[0.02em] text-teal-900 shadow-sm shadow-stone-900/[0.02]">
            <svg aria-hidden="true" className="size-3.5" viewBox="0 0 20 20" fill="none"><path d="M10 2.5 3.5 5.4v4.2c0 4.1 2.8 6.6 6.5 7.9 3.7-1.3 6.5-3.8 6.5-7.9V5.4L10 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="m7.3 10 1.8 1.8 3.8-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Private PDF tools, right in your browser
          </div>
          <h1 className="mt-6 text-[clamp(2.55rem,6vw,4.5rem)] font-semibold leading-[1.04] tracking-[-0.065em] text-[#1d2d29]">
            Your files never leave<br className="hidden sm:block" /> your computer<span className="text-teal-700">.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-stone-500 sm:text-base">
            Simple PDF tools that work privately on your device. No uploads, no accounts, no fuss.
          </p>
          <ul aria-label="What makes NoUploadPDF simple" className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-stone-600">
            {["No uploads", "No sign-up", "Free"].map((point) => (
              <li className="inline-flex items-center gap-1.5 rounded-full border border-teal-900/10 bg-white/80 px-3 py-1.5 shadow-sm shadow-stone-900/[0.02]" key={point}>
                <svg aria-hidden="true" className="size-3.5 text-teal-700" fill="none" viewBox="0 0 16 16"><path d="m3.5 8.2 2.8 2.7 6.2-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <section aria-labelledby="how-it-works" className="relative mx-auto mt-10 max-w-3xl rounded-2xl border border-stone-200/80 bg-white/80 px-5 py-5 sm:mt-12 sm:px-6">
          <h2 id="how-it-works" className="text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-teal-800/75">How it works</h2>
          <ol role="list" className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
            {["Choose a PDF", "Your browser does the work", "Download the result"].map((step, index) => (
              <li className="flex items-center gap-2.5 text-[13px] font-medium leading-5 text-stone-600" key={step}>
                <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-800 ring-1 ring-teal-900/5">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <div className="relative mx-auto mt-16 max-w-6xl sm:mt-20">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-teal-800/75">The toolbox</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.04em] text-stone-900 sm:text-2xl">Everything you need for PDFs</h2>
            </div>
            <span className="mb-0.5 hidden text-xs text-stone-400 sm:block">11 free tools · Coming soon</span>
          </div>
          <div className="space-y-9">
            {toolGroups.map((group) => {
              const groupTools = tools.filter((tool) => tool.group === group);

              return (
                <section aria-labelledby={`group-${group.toLowerCase()}`} key={group}>
                  <h3 id={`group-${group.toLowerCase()}`} className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">{group}</h3>
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {groupTools.map((tool) => <ToolCard key={tool.name} {...tool} />)}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200/80 bg-white/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-stone-400 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span>© 2026 NoUploadPDF</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500" /> Your files stay on your device</span>
        </div>
      </footer>
    </main>
  );
}
