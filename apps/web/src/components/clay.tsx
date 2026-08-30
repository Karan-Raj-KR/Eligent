"use client";

import {
  forwardRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/* ClayCard                                                            */
/* ------------------------------------------------------------------ */

type ClayTone = "cobalt" | "coral" | "lime";

interface ClayCardProps extends ComponentProps<"div"> {
  raised?: boolean;
  inset?: boolean;
  tone?: ClayTone;
  topAccent?: ClayTone;
}

export function ClayCard({
  raised = true,
  inset,
  tone,
  topAccent,
  className,
  children,
  ...rest
}: ClayCardProps) {
  return (
    <div
      className={cn(
        "clay",
        !inset && raised && "clay--raised",
        inset && "clay-inset",
        tone === "cobalt" && "clay-tint-cobalt",
        tone === "coral" && "clay-tint-coral",
        tone === "lime" && "clay-tint-lime",
        topAccent === "cobalt" && "clay-top-accent clay-top-accent--cobalt",
        topAccent === "coral" && "clay-top-accent clay-top-accent--coral",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ClayButton                                                          */
/* ------------------------------------------------------------------ */

interface ClayButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "soft" | "coral" | "ghost" | "default";
  block?: boolean;
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function ClayButton({
  variant = "default",
  block,
  icon,
  size = "md",
  className,
  children,
  type = "button",
  ...rest
}: ClayButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "clay-btn",
        variant === "primary" && "clay-btn--primary",
        variant === "soft" && "clay-btn--soft",
        variant === "coral" && "clay-btn--coral",
        variant === "ghost" && "clay-btn--ghost",
        block && "clay-btn--block",
        size === "sm" && "!min-h-[38px] !px-3 !text-[0.84rem] !rounded-[12px]",
        size === "lg" && "!min-h-[54px] !px-7 !text-[1rem] !rounded-[16px]",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* ClayInput / ClaySelect / ClayField                                */
/* ------------------------------------------------------------------ */

interface ClayInputProps extends ComponentProps<"input"> {
  invalid?: boolean;
}

export const ClayInput = forwardRef<HTMLInputElement, ClayInputProps>(
  function ClayInput({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "clay-input",
          invalid && "!border-coral !shadow-[inset_0_1px_3px_rgba(23,21,37,0.05),0_0_0_4px_rgba(255,92,122,0.16)]",
          className,
        )}
        {...rest}
      />
    );
  },
);

interface ClaySelectProps extends ComponentProps<"select"> {
  invalid?: boolean;
}

export const ClaySelect = forwardRef<HTMLSelectElement, ClaySelectProps>(
  function ClaySelect({ className, invalid, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn("clay-input clay-input--select", invalid && "!border-coral", className)}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

interface ClayFieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  optional?: boolean;
}

export function ClayField({
  label,
  htmlFor,
  hint,
  error,
  children,
  optional,
}: ClayFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[0.86rem] font-semibold text-ink"
      >
        {label}
        {optional && (
          <span className="ml-1.5 font-medium text-soft">(optional)</span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-[0.82rem] font-medium text-coral-deep" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[0.82rem] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ClayBadge                                                           */
/* ------------------------------------------------------------------ */

interface ClayBadgeProps extends ComponentProps<"span"> {
  tone?: "default" | "cobalt" | "coral" | "lime";
  icon?: ReactNode;
}

export function ClayBadge({ tone = "default", icon, className, children, ...rest }: ClayBadgeProps) {
  return (
    <span
      className={cn(
        "clay-badge",
        tone === "cobalt" && "clay-badge--cobalt",
        tone === "coral" && "clay-badge--coral",
        tone === "lime" && "clay-badge--lime",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Logo                                                               */
/* ------------------------------------------------------------------ */

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-[12px] bg-ink shadow-[0_2px_0_rgba(23,21,37,0.5),inset_0_1px_0_rgba(255,255,255,0.25)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M20 7L12 16L9.5 12.8L4 15.5V4.5C4 3.7 4.7 3 5.5 3H18.5C19.3 3 20 3.7 20 4.5V7Z"
            fill="#FFF8F0"
          />
          <path
            d="M4 19.5V15.5L9.5 12.8L12 16L20 7V15.5C20 16.3 19.3 17 18.5 17H11.5L8 21L6.5 17H5.5C4.7 17 4 16.3 4 15.5V19.5Z"
            fill="#C7F36B"
          />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-[1.28rem] font-bold tracking-tight text-ink">
          ELIGENT
        </span>
      )}
    </span>
  );
}