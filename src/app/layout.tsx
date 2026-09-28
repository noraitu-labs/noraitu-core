import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nora Itu - Superinteligencia Agéntica",
  description: "Asistente de voz en tiempo real con Neon Postgres y Pollinations AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, backgroundColor: "#090d16", color: "#f0f6fc", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
