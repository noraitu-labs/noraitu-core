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
};

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
        {/* Fuerza scroll vertical en todo momento — anula overflow:hidden de modales en móvil */}
        <style dangerouslySetInnerHTML={{__html: `
          html, body {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            height: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
        `}} />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#090d16", color: "#f0f6fc", fontFamily: "system-ui, -apple-system, sans-serif", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" as any }}>
        {children}
      </body>
    </html>
  );
}
