"use client";

import { usePathname } from "next/navigation";
import { Fragment, type ReactNode } from "react";

export function PageContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Remove the previous route's DOM and workspace when the pathname changes.
  // This boundary sits above Next.js's retained Activity routes in the root layout.
  return <Fragment key={pathname}>{children}</Fragment>;
}
