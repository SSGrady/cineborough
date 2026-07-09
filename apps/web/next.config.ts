import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cineborough/data", "@cineborough/geo"],
};

export default nextConfig;
