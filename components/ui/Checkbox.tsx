"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId =
      id ?? (label ? `cb-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
    return (
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex cursor-pointer items-center gap-2 select-none",
          props.disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className="peer absolute inset-0 size-4 cursor-pointer opacity-0"
            {...props}
          />
          <span
            className={cn(
              "pointer-events-none flex size-4 items-center justify-center rounded border border-white/20 bg-zinc-900 transition-colors",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-zinc-950",
              "peer-checked:border-emerald-500 peer-checked:bg-emerald-600",
              "peer-checked:[&_svg]:opacity-100"
            )}
          >
            <Check className="size-3 text-white opacity-0 transition-opacity" />
          </span>
        </span>
        {label ? (
          <span className="text-sm text-zinc-300">{label}</span>
        ) : null}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
