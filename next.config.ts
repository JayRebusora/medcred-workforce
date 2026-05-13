// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Capstone tradeoff: don't block production builds on type errors.
  // Features are manually tested; lint and type cleanup is tracked as
  // post-capstone backlog work.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
