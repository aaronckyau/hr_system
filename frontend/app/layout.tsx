import "./globals.css";

import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "香港中小企 HR 系統 MVP",
  description: "Next.js + FastAPI HR MVP",
};


export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-HK">
      <body>{children}</body>
    </html>
  );
}

