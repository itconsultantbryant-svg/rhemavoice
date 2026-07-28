/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@rhemavoice/ui", "@rhemavoice/shared", "@rhemavoice/api-client"],
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
