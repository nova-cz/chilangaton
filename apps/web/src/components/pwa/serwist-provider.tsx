"use client";

import { SerwistProvider } from "@serwist/next/react";
import type { ReactNode } from "react";

/** Registra /sw.js (generado por `serwist build`). Apagado en desarrollo para no cachear HMR. */
export function PwaProvider({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider swUrl="/sw.js" disable={process.env.NODE_ENV === "development"}>
      {children}
    </SerwistProvider>
  );
}
