import type { ReactNode } from "react";
import { privateMetadata } from "@/lib/site";

export const metadata = privateMetadata("Institution roster");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
