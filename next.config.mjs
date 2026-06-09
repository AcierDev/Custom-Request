/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16 removed the `eslint` config key; ESLint no longer runs during
  // `next build` (use `next lint` separately), so it's simply omitted.
  typescript: {
    ignoreBuildErrors: true,
  },
  // The old viewer (viewer.everwoodus.com) served shared designs at
  // /?shareId=ID. The design now lives at /shared/ID (the gallery room),
  // so any legacy /?shareId=ID that reaches THIS app is forwarded to it.
  // (Links already pointing at viewer.everwoodus.com need the same
  // redirect added to the Custom-Request-Viewer deployment.)
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "query", key: "shareId", value: "(?<sid>[^&]+)" }],
        destination: "/shared/:sid",
        permanent: true,
      },
    ];
  },
  // Allow loading the dev server from a phone on the LAN (and an HTTPS tunnel)
  // for on-device AR testing — Next 16 otherwise blocks cross-origin dev
  // resources (HMR/RSC) from non-localhost origins, which leaves the page a
  // dead shell. Dev-only; ignored by production builds.
  allowedDevOrigins: ["192.168.1.247", "*.trycloudflare.com", "*.ngrok-free.app"],
};

export default nextConfig;
