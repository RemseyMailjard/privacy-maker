import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-sans font-semibold transition-all duration-150 active:scale-[0.98] active:duration-[50ms] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D4] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#0078D4] text-white border border-transparent shadow-sm hover:bg-[#106EBE] active:bg-[#005A9E]",
        solid:
          "bg-[#0078D4] text-white border border-transparent shadow-sm hover:bg-[#106EBE] active:bg-[#005A9E]",
        destructive:
          "bg-[#D13438] text-white shadow-sm hover:bg-[#A4262C]",
        outline:
          "border border-[#8A8886] bg-white text-[#242424] hover:bg-[#F3F2F1] hover:border-[#0078D4] hover:text-[#0078D4]",
        secondary:
          "bg-[#F3F2F1] text-[#242424] border border-transparent hover:bg-[#E1DFDD]",
        ghost: "hover:bg-[#F3F2F1] text-[#242424] transition-colors duration-200",
        link: "text-[#0078D4] underline-offset-4 decoration-2 decoration-[#0078D4] hover:underline",
      },
      size: {
        default: "h-9 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
