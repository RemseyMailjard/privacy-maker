import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-1.5 w-full overflow-hidden rounded-full bg-[#E1DFDD]",
      className
    )}
    {...props}
  >
    {/* value == null renders Radix's indeterminate state: a sliding brand-blue segment */}
    {value == null ? (
      <ProgressPrimitive.Indicator className="progress-indeterminate absolute inset-y-0 w-1/3 bg-[#0078D4]" />
    ) : (
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-[#0078D4] transition-all duration-300 ease-out"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    )}
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
