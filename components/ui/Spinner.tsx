import { cn } from "@/lib/utils/cn";

export function Spinner({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const s =
    size === "sm" ? "size-4 border" : size === "lg" ? "size-10 border-2" : "size-6 border-2";
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin rounded-full border-emerald-500/30 border-t-emerald-400",
        s,
        className
      )}
    />
  );
}
