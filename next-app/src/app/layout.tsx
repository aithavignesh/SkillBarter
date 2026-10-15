import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkillBarter — Learn together",
  description: "Exchange skills, grow together, and learn from your community."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
