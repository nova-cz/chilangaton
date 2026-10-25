import { PwaProvider } from "@/components/pwa/serwist-provider";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Equilibici", template: "%s · Equilibici" },
  description:
    "Prototipo de movilidad en bici para la CDMX: estaciones, disponibilidad y misiones de rebalanceo. Proyecto independiente para el Chilangotón 2026, sin afiliación con ECOBICI.",
  applicationName: "Equilibici",
  appleWebApp: { capable: true, title: "Equilibici", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#063f2e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
