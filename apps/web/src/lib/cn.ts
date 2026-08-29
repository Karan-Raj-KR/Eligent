// The teammate merge (Eligent) imports `cn` from here. Re-exported from our
// real implementation rather than duplicated — theirs was a plain string join;
// ours (clsx + tailwind-merge) also resolves conflicting Tailwind classes,
// which the copied Clay components rely on for `className` overrides.
export { cn } from "./utils";
