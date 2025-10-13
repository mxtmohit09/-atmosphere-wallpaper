import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Atmosphere Wallpaper Generator",
  description: "Terms of service for Atmosphere Wallpaper Generator",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 mb-4">
            <strong>Last updated:</strong> {new Date().toLocaleDateString()}
          </p>
          
          <h2 className="text-xl font-semibold mb-3">Acceptance of Terms</h2>
          <p className="text-gray-300 mb-4">
            By using Atmosphere Wallpaper Generator, you agree to be bound by these Terms of Service.
          </p>
          
          <h2 className="text-xl font-semibold mb-3">Use of Service</h2>
          <p className="text-gray-300 mb-4">
            This service is provided for personal, non-commercial use. You may:
          </p>
          <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
            <li>Upload your own images to create wallpapers</li>
            <li>Download generated wallpapers for personal use</li>
            <li>Share wallpapers you create with others</li>
          </ul>
          
          <h2 className="text-xl font-semibold mb-3">Prohibited Uses</h2>
          <p className="text-gray-300 mb-4">
            You may not use this service to:
          </p>
          <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
            <li>Upload copyrighted material without permission</li>
            <li>Upload inappropriate or offensive content</li>
            <li>Attempt to harm or disrupt the service</li>
            <li>Use the service for commercial purposes without permission</li>
          </ul>
          
          <h2 className="text-xl font-semibold mb-3">Disclaimer</h2>
          <p className="text-gray-300 mb-4">
            This service is provided &quot;as is&quot; without warranties of any kind. We are not responsible 
            for any damages resulting from the use of this service.
          </p>
          
          <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
          <p className="text-gray-300 mb-4">
            If you have any questions about these Terms of Service, please contact us.
          </p>
        </div>
      </div>
    </div>
  );
}
