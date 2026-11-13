import type { ReactNode } from "react";
import { privateMetadata } from "@/lib/site";

export const metadata = privateMetadata("Create an opportunity");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
