"use client";

import { AuthProvider } from "@/lib/auth";
import { useSync } from "@/lib/useSync";
import type { ReactNode } from "react";

function SyncLayer({ children }: { children: ReactNode }) {
  useSync();
  return <>{children}</>;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SyncLayer>{children}</SyncLayer>
    </AuthProvider>
  );
}
