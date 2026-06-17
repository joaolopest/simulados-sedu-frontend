"use client";

import { useState, type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

interface ProvedoresAppProps {
  children: ReactNode;
}

export function ProvedoresApp({ children }: ProvedoresAppProps) {
  const [clienteQuery] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={clienteQuery}>
        <TooltipProvider delayDuration={300} skipDelayDuration={150}>
          {children}
        </TooltipProvider>
        <Toaster
          position="top-right"
          theme="system"
          richColors
          closeButton
          duration={4000}
          toastOptions={{
            classNames: {
              toast:
                "border-border bg-card text-card-foreground shadow-[0_8px_24px_rgba(15,23,42,0.08)]",
              title: "font-medium",
              description: "text-muted-foreground",
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
