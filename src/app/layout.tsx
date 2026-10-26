import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export const metadata: Metadata = {
  title: "SkillBridge — Turn Skills Into Real Experience",
  description: "Micro-apprenticeship untuk project transformasi digital UMKM Indonesia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={dmSans.variable}>
      <body>{children}</body>
    </html>
  );
}
