export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Nora Itu PRO",
  description: "Plataforma de IA Inclusiva Corporativa - Nexora One",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nora Itu PRO",
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import { NoraSecurityProvider } from "@/components/NoraSecurityProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#09090b" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <script src="https://cdn.tailwindcss.com"></script>
        {/* Estructura para móviles, PWAs y navegadores de escritorio */}
        <style dangerouslySetInnerHTML={{__html: `
          html, body {
            height: 100% !important;
            height: 100dvh !important;
            width: 100% !important;
            margin: 0;
            padding: 0;
            background-color: #020617;
            overflow: hidden !important;
            overscroll-behavior: none !important;
            overscroll-behavior-y: none !important;
            -webkit-overscroll-behavior-y: none !important;
            touch-action: none;
            -webkit-user-select: none;
            user-select: none;
          }
          input, textarea {
            -webkit-user-select: text;
            user-select: text;
            touch-action: pan-y;
          }
          img {
            max-width: 100%;
            height: auto;
          }
        `}} />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#020617", color: "#f0f6fc", fontFamily: "system-ui, -apple-system, sans-serif", width: "100%", height: "100%", overflow: "hidden", overscrollBehavior: "none", overscrollBehaviorY: "none", touchAction: "none" }}>
        <NoraSecurityProvider>
          {children}
        </NoraSecurityProvider>
      </body>
    </html>
  );
}
