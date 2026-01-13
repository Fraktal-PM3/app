import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["fraktal-lib"],
  reactCompiler: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "react-leaflet"],
  },
};

export default nextConfig;
