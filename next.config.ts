import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera um servidor mínimo e auto-contido em .next/standalone — ideal pra Docker.
  output: "standalone",
};

export default nextConfig;
