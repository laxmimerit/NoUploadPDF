import Link from "next/link";

export function Brand() {
  return (
    <Link aria-label="NoUploadPDF home" className="site-brand" href="/">
      <svg aria-hidden="true" className="brand-mark" fill="none" viewBox="0 0 48 48">
        <rect width="48" height="48" rx="12" className="logo-tile" />
        <path d="M12 9h14l7 7v23H12z" fill="#f7f6f3" />
        <path d="M26 9v7h7z" className="logo-green" />
        <rect x="24" y="24" width="18" height="18" rx="4.5" className="logo-tile" />
        <path d="M29.5 31v-2.5a3.5 3.5 0 0 1 7 0V31" className="logo-shackle"
          strokeWidth="2.6" strokeLinecap="round" />
        <rect x="26.5" y="30.5" width="13" height="9" rx="2.2" className="logo-green" />
        <circle cx="33" cy="35" r="1.5" className="logo-tile" />
      </svg>
      <span>NoUpload<span className="brand-pdf">PDF</span></span>
    </Link>
  );
}
