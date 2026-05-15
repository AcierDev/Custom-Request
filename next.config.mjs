/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16 removed the `eslint` config key; ESLint no longer runs during
  // `next build` (use `next lint` separately), so it's simply omitted.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
