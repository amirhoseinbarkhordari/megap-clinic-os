import type { Metadata } from "next";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "./globals.css";
import "./product.css";
import { AuthProvider } from "../lib/auth-context";

export const metadata: Metadata = {
  title: "MEGAP | مدیریت کلینیک",
  description: "سامانه مدیریت کلینیک MEGAP",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
