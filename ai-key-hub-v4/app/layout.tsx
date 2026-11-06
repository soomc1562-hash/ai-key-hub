import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Key Hub",
  description: "One workspace for your AI providers."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}