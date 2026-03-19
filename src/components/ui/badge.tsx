import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/90 text-primary-foreground hover:bg-primary/70 backdrop-blur-sm",
        secondary: "border-transparent bg-secondary/80 text-secondary-foreground hover:bg-secondary/60 backdrop-blur-sm",
        destructive: "border-transparent bg-destructive/80 text-destructive-foreground hover:bg-destructive/60 backdrop-blur-sm",
        outline: "text-foreground border-border/40 bg-card/40 backdrop-blur-sm",
        glass: "border-border/30 bg-card/40 backdrop-blur-glass text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
