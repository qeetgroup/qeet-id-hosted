import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the container image (Dockerfile). Vercel
  // ignores this and keeps using its own build output.
  output: "standalone",
  reactCompiler: true,
  transpilePackages: ["@qeetrix/ui"],
};

export default nextConfig;
