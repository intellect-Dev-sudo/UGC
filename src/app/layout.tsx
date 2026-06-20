import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UGC Studio — AI Video Generator",
  description: "Send a product URL, get a UGC-style video. Instantly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
