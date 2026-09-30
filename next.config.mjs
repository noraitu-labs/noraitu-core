import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Políticas de permisos: permite cámara, micrófono y geolocalización en todos los orígenes
          {
            key: "Permissions-Policy",
            value: "camera=*, microphone=*, geolocation=*, display-capture=*",
          },
          // Feature-Policy legacy para browsers antiguos
          {
            key: "Feature-Policy",
            value: "camera *; microphone *; geolocation *",
          },
          // Permite uso de recursos de cámara/audio en contexto seguro
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
