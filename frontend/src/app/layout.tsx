/**
 * Root Layout
 * 
 * Main application layout with global styles, fonts, and metadata
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LayoutWrapper } from "@/components/layouts/layout-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cub Scout Volunteer Management",
    template: "%s | Cub Scout Volunteer Management",
  },
  description:
    "Volunteer management system for Cub Scout packs with event coordination, activity tracking, and gamification",
  keywords: [
    "cub scouts",
    "volunteer management",
    "event coordination",
    "activity tracking",
    "gamification",
  ],
  authors: [
    {
      name: "Cub Scout Pack",
    },
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Cub Scout Volunteer Management",
    title: "Cub Scout Volunteer Management",
    description:
      "Volunteer management system for Cub Scout packs with event coordination and activity tracking",
  },
  robots: {
    index: false, // Don't index in search engines (internal tool)
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
