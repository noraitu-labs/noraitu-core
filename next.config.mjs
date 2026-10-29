import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  fallbacks: {
    document: "/",
  },
  workboxOptions: {
    disableDevLogs: true,
    clientsClaim: true,
    skipWaiting: true,
    runtimeCaching: [
      // 1. Ruta raíz y navegación de páginas: NetworkFirst inmediato para descargar la última versión de Vercel
      {
        urlPattern: ({ request, url }) => request.mode === "navigate" || url.pathname === "/",
        handler: "NetworkFirst",
        options: {
          cacheName: "nora-pages-cache",
          expiration: {
            maxEntries: 16,
            maxAgeSeconds: 24 * 60 * 60, // 24 horas máximo para invalidar rápido versiones viejas
          },
          networkTimeoutSeconds: 2,
        },
      },
      // 2. Recursos estáticos inmutables de Next.js (JS, CSS chunks)
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "nora-static-chunks",
          expiration: {
            maxEntries: 128,
            maxAgeSeconds: 60 * 24 * 60 * 60, // 60 días
          },
        },
      },
      // 3. Imágenes, íconos y avatar
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "nora-media-cache",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
      // 4. Fuentes y estilos
      {
        urlPattern: /\.(?:woff|woff2|eot|ttf|otf|css)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "nora-fonts-styles",
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 60 * 24 * 60 * 60,
          },
        },
      },
      // 5. Tailwind CDN script
      {
        urlPattern: /^https:\/\/cdn\.tailwindcss\.com/i,
        handler: "CacheFirst",
        options: {
          cacheName: "nora-tailwind-cdn",
          expiration: {
            maxEntries: 5,
            maxAgeSeconds: 60 * 24 * 60 * 60,
          },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Blindaje Antirrobo y Seguridad en Producción
  output: "standalone",
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optimización de Memoria RAM Local en Desarrollo y Servidor
  onDemandEntries: {
    // Período máximo de inactividad antes de liberar páginas no visitadas de memoria (ms)
    maxInactiveAge: 15 * 1000,
    // Número máximo de páginas mantenidas en el buffer de compilación
    pagesBufferLength: 2,
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Evita retención excesiva de memoria en cache de Webpack en desarrollo local
      config.cache = {
        type: "memory",
        maxGenerations: 1,
      };
    }
    return config;
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
