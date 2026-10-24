/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep ws out of the webpack bundle: bundled, it fails with "bufferUtil.mask is not a function".
    // Next 15 renames this option to serverExternalPackages.
    serverComponentsExternalPackages: ["ws"],
  },
  async headers() {
    return [
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Mwthods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "Content-Range",
            value: "bytes : 0-9/*",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
