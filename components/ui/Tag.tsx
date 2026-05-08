import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const variants = {
  default: "bg-zinc-800 text-zinc-300 border-white/10",
  accent: "bg-emerald-950/60 text-emerald-300 border-emerald-500/20",
  muted: "bg-zinc-900 text-zinc-500 border-transparent",
} as const;

export function Tag({
  className,
  variant = "default",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-md border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
