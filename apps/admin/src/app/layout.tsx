import type { Metadata } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "RhemaVoice Admin",
  description: "Super Admin and module administration",
  icons: {
    icon: [{ url: "/brand/rhemavoice_logo.jpeg", type: "image/jpeg" }],
    apple: [{ url: "/brand/rhemavoice_logo.jpeg" }],
    shortcut: ["/brand/rhemavoice_logo.jpeg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
