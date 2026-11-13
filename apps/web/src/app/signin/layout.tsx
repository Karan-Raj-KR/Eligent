import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("signin", "/signin");

export default function SignInLayout({ children }: { children: ReactNode }) {
  return children;
}
