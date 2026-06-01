/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16 removed the `eslint` config key; ESLint no longer runs during
  // `next build` (use `next lint` separately), so it's simply omitted.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow loading the dev server from a phone on the LAN (and an HTTPS tunnel)
  // for on-device AR testing — Next 16 otherwise blocks cross-origin dev
  // resources (HMR/RSC) from non-localhost origins, which leaves the page a
  // dead shell. Dev-only; ignored by production builds.
  allowedDevOrigins: ["192.168.1.247", "*.trycloudflare.com", "*.ngrok-free.app"],
};

export default nextConfig;
