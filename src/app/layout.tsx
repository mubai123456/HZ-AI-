import type { Metadata } from "next";

import { getResolvedSiteSettings } from "@/lib/settings";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getResolvedSiteSettings();

  return {
    title: siteSettings.siteName,
    description: siteSettings.siteDescription,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteSettings = await getResolvedSiteSettings();

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content={siteSettings.themeColor} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
