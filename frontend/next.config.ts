import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
