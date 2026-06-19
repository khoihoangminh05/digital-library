import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained build for small Docker images
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/library",
        destination: "/books",
        permanent: true,
      },
      {
        source: "/library/read/:id",
        destination: "/books/read/:id",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
