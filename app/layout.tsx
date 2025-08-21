import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PortalLayoutWrapper } from "@/components/layout/PortalLayoutWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Heat Pumps Now - Internal Portal",
  description: "Unified internal portal for Heat Pumps Now operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <PortalLayoutWrapper>
            {children}
          </PortalLayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
