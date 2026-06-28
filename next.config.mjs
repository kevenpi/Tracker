/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma Client must not be bundled by the server build; keep it external.
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
};

export default nextConfig;
