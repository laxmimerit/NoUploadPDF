import Link from "next/link";
import { groupedTools } from "@/lib/tools";
import { ToolNavigation } from "@/components/tool-navigation";

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="site-header">
        <Link aria-label="NoUploadPDF home" className="site-brand" href="/">
          <svg aria-hidden="true" className="size-9" fill="none" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="9" className="fill-teal-800" />
            <path
              d="M10 6.5h8l5 5V25H10V6.5Z M18 7v5h5"
              stroke="white"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <rect x="13" y="17" width="7" height="5" rx="1" fill="white" />
            <path d="M14.5 17v-1.5a2 2 0 0 1 4 0V17" stroke="white" strokeWidth="1.5" />
          </svg>
          <span>NoUpload<span className="text-teal-800">PDF</span></span>
        </Link>
        <ToolNavigation groups={groupedTools} />
      </div>
    </header>
  );
}
