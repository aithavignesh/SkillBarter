import type { Metadata } from "next";
import "./globals.css";
import AnalyticsTracker from "./AnalyticsTracker";

export const metadata: Metadata = {
  title: "SkillBarter — Learn together",
  description: "Exchange skills, grow together, and learn from your community."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AnalyticsTracker />{children}</body>
    </html>
  );
}
