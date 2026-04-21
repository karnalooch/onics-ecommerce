import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-[11px] font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-20 active:scale-95 active:shadow-inner italic",
  {
    variants: {
      variant: {
        default:
          "bg-slate-950 text-white hover:bg-primary hover:text-white border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 border-2 border-red-800",
        outline:
          "border-2 border-slate-200 bg-white hover:border-slate-950 hover:bg-slate-50",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200 border-2 border-slate-200",
        ghost: "hover:bg-slate-50 hover:text-slate-950 border-2 border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-8 py-2",
        sm: "h-9 px-4 text-[10px]",
        lg: "h-14 px-10 text-[13px]",
        icon: "h-11 w-11",
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
        className={cn(buttonVariants({ variant, size, className }), "active-press")}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
