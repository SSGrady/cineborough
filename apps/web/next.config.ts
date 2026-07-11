import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cineborough/data", "@cineborough/geo"],
  webpack(config) {
    // @cineborough/data imports *.geojson from data/mock/ — treat as JSON
    config.module.rules.push({
      test: /\.geojson$/,
      type: "json",
    });
    return config;
  },
};

export default nextConfig;
