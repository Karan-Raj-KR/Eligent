import type { ReactNode } from "react";
import { privateMetadata } from "@/lib/site";

export const metadata = privateMetadata("Your opportunities");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
