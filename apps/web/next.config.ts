import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @opportunity/engine ships raw TS; Next needs to transpile it like local source.
  transpilePackages: ["@opportunity/engine"],
};

export default nextConfig;
