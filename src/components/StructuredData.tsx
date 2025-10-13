export default function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Atmosphere Wallpaper Generator",
    "description": "Transform your photos into beautiful atmospheric wallpapers with our free online generator. Customize blur, size, and resolution for phone, desktop, and tablet wallpapers.",
    "url": "https://atmospherewallpaper.com",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "creator": {
      "@type": "Organization",
      "name": "Atmosphere Wallpaper Generator",
      "logo": {
        "@type": "ImageObject",
        "url": "https://atmospherewallpaper.com/favicon-48x48.png",
        "width": 48,
        "height": 48
      }
    },
    "logo": {
      "@type": "ImageObject",
      "url": "https://atmospherewallpaper.com/favicon-48x48.png",
      "width": 48,
      "height": 48
    },
    "featureList": [
      "Upload your own images",
      "Customizable blur intensity",
      "Adjustable element size",
      "Multiple resolution presets",
      "Real-time preview",
      "Download generated wallpapers",
      "Mobile-friendly interface"
    ],
    "browserRequirements": "Requires JavaScript. Requires HTML5.",
    "softwareVersion": "1.0",
    "datePublished": "2024-01-01",
    "dateModified": new Date().toISOString().split('T')[0],
    "inLanguage": "en-US",
    "isAccessibleForFree": true,
    "license": "https://creativecommons.org/licenses/by/4.0/",
    "mainEntity": {
      "@type": "SoftwareApplication",
      "name": "Atmosphere Wallpaper Generator",
      "description": "Free online tool to create atmospheric wallpapers from photos",
      "applicationCategory": "MultimediaApplication",
      "operatingSystem": "Web Browser"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData),
      }}
    />
  );
}


