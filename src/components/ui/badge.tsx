import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 font-sans text-[10px] uppercase tracking-[0.12em] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#0078D4] text-white",
        secondary:
          "border-transparent bg-[#F3F2F1] text-[#242424]",
        destructive:
          "border-transparent bg-[#D13438] text-white",
        outline: "text-[#242424] border-[#8A8886]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
