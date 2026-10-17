"use client";

import { useSecurityLockdown } from "@/hooks/useSecurityLockdown";

export function NoraSecurityProvider({ children }: { children: React.ReactNode }) {
  useSecurityLockdown();
  return <>{children}</>;
}
