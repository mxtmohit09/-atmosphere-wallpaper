import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atmosphere Generator",
  description: "Create stunning wallpapers from your photos",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
