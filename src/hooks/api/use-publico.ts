"use client";

import { useQuery } from "@tanstack/react-query";
import { obter } from "@/lib/api";
import type { LandingPublica } from "@/app/api/public/landing/route";

export function useLandingPublica() {
  return useQuery({
    queryKey: ["public", "landing"],
    queryFn: () => obter<LandingPublica>("/public/landing"),
    staleTime: 60_000,
  });
}
