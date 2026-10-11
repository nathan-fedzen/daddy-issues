import type { Metadata } from "next";
import "@fontsource-variable/big-shoulders-display";
import "@fontsource-variable/archivo";
import "./globals.css";
import { league } from "@/config/league";

export const metadata: Metadata = {
  title: league.newsletter.name,
  description: league.newsletter.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="font-body text-ink bg-paper">{children}</body>
    </html>
  );
}
