"use client";

/**
 * NEXORA ONE ENGINE — ROOT ENTRY POINT
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Repository: D:\Nora itu UTN
 * Route: src/app/page.tsx
 *
 * Directly mounts the Nexora Industrial Workspace Canvas at the root route (/),
 * guaranteeing instant 200 OK without redirect round-trips or routing ambiguities.
 */

import NexoraOneEnginePage from "./nexora/page";

export default function HomePage() {
  return <NexoraOneEnginePage />;
}
