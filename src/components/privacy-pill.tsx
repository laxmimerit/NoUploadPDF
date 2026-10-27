import type { ReactNode } from "react";

export function PrivacyPill({ children = "0 bytes uploaded" }: { children?: ReactNode }) {
  return <span className="privacy-pill"><span aria-hidden="true" />{children}</span>;
}
