import type { Metadata } from "next";
import "./globals.css";
import GoogleAnalytics from "../components/GoogleAnalytics";
import StructuredData from "../components/StructuredData";

export const metadata: Metadata = {
  title: "Atmosphere Wallpaper Generator - Create Stunning Wallpapers from Photos",
  description: "Transform your photos into beautiful atmospheric wallpapers with our free online generator. Customize blur, size, and resolution for phone, desktop, and tablet wallpapers. No registration required!",
  keywords: "wallpaper generator,abstract wallpaper,atmosphere wallpaper, nothing wallpaper, atmospheric wallpapers, photo to wallpaper, custom wallpapers, phone wallpapers, desktop wallpapers, blur effects, wallpaper maker, free wallpaper generator",
  authors: [{ name: "Atmosphere Wallpaper Generator" }],
  creator: "Atmosphere Wallpaper Generator",
  publisher: "Atmosphere Wallpaper Generator",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://atmospherewallpaper.com',
    title: 'Atmosphere Wallpaper Generator - Create Stunning Wallpapers from Photos',
    description: 'Transform your photos into beautiful atmospheric wallpapers with our free online generator. Customize blur, size, and resolution for phone, desktop, and tablet wallpapers.',
    siteName: 'Atmosphere Wallpaper Generator',
    images: [
      {
        url: 'https://atmospherewallpaper.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Atmosphere Wallpaper Generator - Create beautiful wallpapers from your photos',
        type: 'image/jpeg',
      },
      {
        url: 'https://atmospherewallpaper.com/og-image-square.jpg',
        width: 1200,
        height: 1200,
        alt: 'Atmosphere Wallpaper Generator - Create beautiful wallpapers from your photos',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Atmosphere Wallpaper Generator - Create Stunning Wallpapers from Photos',
    description: 'Transform your photos into beautiful atmospheric wallpapers with our free online generator.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#3b82f6' },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ;
  return (
    <html lang="en">
      <head>
        <StructuredData />
        {measurementId && <GoogleAnalytics measurementId={measurementId} />}
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
