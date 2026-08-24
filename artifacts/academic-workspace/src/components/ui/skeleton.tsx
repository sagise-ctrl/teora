import * as React from "react"

import { cn } from "@/lib/utils"

const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative overflow-hidden rounded-md bg-muted", className)}
    {...props}
  >
    {/* Shimmer overlay */}
    <div
      className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
      style={{
        background: "linear-gradient(90deg, transparent 0%, hsl(var(--muted-foreground) / 0.08) 50%, transparent 100%)",
      }}
    />
  </div>
))
Skeleton.displayName = "Skeleton"

export { Skeleton }
