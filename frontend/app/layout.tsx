import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "香港中小企 HR 系統 MVP",
  description: "適合 30 人以下香港公司的 HR、請假、薪資與 MPF MVP",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-HK">
      <body>{children}</body>
    </html>
  );
}
