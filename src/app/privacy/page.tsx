import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Atmosphere Wallpaper Generator",
  description: "Privacy policy for Atmosphere Wallpaper Generator",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 mb-4">
            <strong>Last updated:</strong> {new Date().toLocaleDateString()}
          </p>
          
          <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
          <p className="text-gray-300 mb-4">
            Atmosphere Wallpaper Generator is designed with privacy in mind. We collect minimal information:
          </p>
          <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
            <li>Images you upload are processed locally in your browser and are not stored on our servers</li>
            <li>We use Google Analytics to understand usage patterns (anonymized data)</li>
            <li>No personal information is collected or stored</li>
          </ul>
          
          <h2 className="text-xl font-semibold mb-3">How We Use Information</h2>
          <p className="text-gray-300 mb-4">
            Any data we collect is used solely to improve the service and understand usage patterns.
          </p>
          
          <h2 className="text-xl font-semibold mb-3">Data Security</h2>
          <p className="text-gray-300 mb-4">
            Your uploaded images are processed entirely in your browser and never leave your device. 
            We implement appropriate security measures to protect any data we do collect.
          </p>
          
          <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
          <p className="text-gray-300 mb-4">
            If you have any questions about this Privacy Policy, please contact us.
          </p>
        </div>
      </div>
    </div>
  );
}


