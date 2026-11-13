import type { ReactNode } from "react";
import { privateMetadata } from "@/lib/site";

export const metadata = privateMetadata("Opportunity");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
