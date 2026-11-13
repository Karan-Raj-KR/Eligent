import { Suspense, type ReactNode } from "react";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("extension", "/extension");

export default function ExtensionLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
