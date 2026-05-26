import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const categoryBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-md border border-transparent font-mono uppercase whitespace-nowrap [&>svg]:pointer-events-none",
  {
    variants: {
      categoria: {
        aprendizado: "bg-success-muted text-success",
        missao: "bg-warning-muted text-warning",
        autoridade: "bg-primary-muted text-primary-text",
        ia: "bg-ia-muted text-ia-text",
        destrutivo: "bg-destructive-muted text-destructive",
        neutro: "bg-muted text-muted-foreground",
      },
      tamanho: {
        xs: "h-5 px-2 text-[10px] tracking-[0.12em] [&>svg]:size-3",
        sm: "h-6 px-2.5 text-[11px] tracking-[0.08em] [&>svg]:size-3.5",
      },
    },
    defaultVariants: {
      categoria: "neutro",
      tamanho: "xs",
    },
  },
);

export type CategoriaSemantica = NonNullable<
  VariantProps<typeof categoryBadgeVariants>["categoria"]
>;

export type TamanhoCategoryBadge = NonNullable<
  VariantProps<typeof categoryBadgeVariants>["tamanho"]
>;

export interface CategoryBadgeProps
  extends Omit<React.ComponentProps<"span">, "children">,
    VariantProps<typeof categoryBadgeVariants> {
  icone?: LucideIcon;
  children: React.ReactNode;
}

export function CategoryBadge({
  categoria,
  tamanho,
  icone: Icone,
  className,
  children,
  ...props
}: CategoryBadgeProps) {
  return (
    <span
      data-slot="category-badge"
      data-categoria={categoria ?? "neutro"}
      className={cn(categoryBadgeVariants({ categoria, tamanho }), className)}
      {...props}
    >
      {Icone && <Icone aria-hidden />}
      {children}
    </span>
  );
}

export { categoryBadgeVariants };
