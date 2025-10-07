"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import CanvasRenderer from "../components/CanvasRenderer";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [blur, setBlur] = useState(0); // 0 now represents 60% blur
  const [size, setSize] = useState(100);
  const [canvasBlur, setCanvasBlur] = useState(0); // Debounced blur for canvas
  const [canvasSize, setCanvasSize] = useState(100); // Debounced size for canvas
  const [resolution, setResolution] = useState({ w: 1260, h: 2800 });
  const [shouldGenerate, setShouldGenerate] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Optimized handlers with requestAnimationFrame for smoother updates
  const blurTimeout = useRef<NodeJS.Timeout | null>(null);
  const sizeTimeout = useRef<NodeJS.Timeout | null>(null);
  const animationFrame = useRef<number | null>(null);
  
  // Immediate slider feedback with debounced canvas updates
  const optimizedSetBlur = useCallback((value: number) => {
    // Immediate visual feedback for slider
    setBlur(value);
    
    // Debounced canvas update - only update canvas after user stops moving slider
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
    }
    blurTimeout.current = setTimeout(() => {
      setCanvasBlur(value);
    }, 500);
  }, []);
  
  const optimizedSetSize = useCallback((value: number) => {
    // Immediate visual feedback for slider
    setSize(value);
    
    // Debounced canvas update - only update canvas after user stops moving slider
    if (sizeTimeout.current) {
      clearTimeout(sizeTimeout.current);
    }
    sizeTimeout.current = setTimeout(() => {
      setCanvasSize(value);
    }, 500);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setGeneratedUrl(null);
    setShouldGenerate(false);
    // Initialize canvas values
    setCanvasBlur(blur);
    setCanvasSize(size);
  };

  const handleGenerate = () => {
    if (file) {
      setShouldGenerate(true);
      setGeneratedUrl(null);
    }
  };

  const handleStop = () => {
    setShouldGenerate(false);
    setIsProcessing(false);
  };

  const handleGenerationComplete = (url: string) => {
    setGeneratedUrl(url);
    setShouldGenerate(false); // Reset generation state
  };

  // Initialize canvas values on component mount
  useEffect(() => {
    setCanvasBlur(blur);
    setCanvasSize(size);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 relative group">
            <span className="bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent tracking-wide">
              Atmospheric
            </span>
            <span className="text-white ml-2 font-light">Wallpaper Generator</span>
            <div className="absolute -bottom-1 left-0 w-24 h-0.5 bg-gradient-to-r from-white via-gray-400 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute -bottom-1 left-0 w-24 h-px bg-white opacity-30"></div>
          </h1>
          <p className="text-gray-400 text-sm tracking-wide font-mono">
            Create stunning wallpapers from your photos
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Upload Section - Mobile First */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-gray-700/50">
            <div className="flex flex-col items-center gap-3">
              {/* Upload Button */}
              <label className="group cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg transition-colors duration-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="font-medium text-sm">Upload Image</span>
                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </label>
              
              {file && (
                <div className="text-center">
                  <p className="text-xs text-gray-400">Selected: {file.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Preview</h3>
              <div className="text-xs text-gray-400">
                {resolution.w} × {resolution.h}
              </div>
            </div>
            
            {/* Resolution Selector */}
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-300 mb-2 block">Resolution</label>
              <select 
                value={`${resolution.w}x${resolution.h}`} 
                onChange={(e) => {
                  const [w, h] = e.target.value.split("x").map(Number);
                  setResolution({ w, h });
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1260x2800">Nothing Phone 3 (1260×2800)</option>
                <option value="1080x2400">Phone (1080×2400)</option>
                <option value="1170x2532">iPhone (1170×2532)</option>
                <option value="1440x3120">Large (1440×3120)</option>
                <option value="720x1280">Small (720×1280)</option>
              </select>
            </div>
            
            <div className="bg-black/40 rounded-xl p-2 min-h-[200px] sm:min-h-[250px] flex items-center justify-center relative">
              <CanvasRenderer
                file={file}
                width={resolution.w}
                height={resolution.h}
                blurPx={canvasBlur + 60}
                sizeMultiplier={canvasSize}
                shouldGenerate={shouldGenerate}
                onCanvasRef={(c) => canvasRef.current = c}
                onGenerated={handleGenerationComplete}
                onProcessingChange={setIsProcessing}
              />
              {isProcessing && (
                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs z-10">
                  Generating...
                </div>
              )}
              
              {/* Download Button Overlay - appears after generation */}
              {generatedUrl && (
                <button
                  onClick={() => {
                    if (!canvasRef.current) return;
                    const link = document.createElement("a");
                    link.download = `atmosphere_wallpaper_${resolution.w}x${resolution.h}.png`;
                    link.href = canvasRef.current.toDataURL("image/png");
                    link.click();
                  }}
                  className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white px-3 py-2 rounded-lg transition-colors duration-200 z-10 flex items-center gap-2"
                  title="Download Wallpaper"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium">Download</span>
                </button>
              )}
              
              {/* Controls Overlay - Bottom */}
              <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-sm rounded-lg p-2 z-20">
                <div className="grid grid-cols-2 gap-3">
                  {/* Blur Control */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-300">Blur</label>
                      <span className="text-xs font-mono bg-gray-700 px-1 py-0.5 rounded text-white">{blur + 60}%</span>
                    </div>
                    <input 
                      type="range" 
                      min={0} 
                      max={60} 
                      value={blur} 
                      onChange={(e) => optimizedSetBlur(Number(e.target.value))}
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>

                  {/* Size Control */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-300">Size</label>
                      <span className="text-xs font-mono bg-gray-700 px-1 py-0.5 rounded text-white">{size}%</span>
                    </div>
                    <input 
                      type="range" 
                      min={50} 
                      max={150} 
                      value={size} 
                      onChange={(e) => optimizedSetSize(Number(e.target.value))}
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Generate Button - below canvas */}
            {file && (
              <div className="mt-3 text-center">
                {!isProcessing ? (
                  <button
                    onClick={handleGenerate}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg font-medium text-sm transition-colors duration-200"
                  >
                    Generate Atmosphere
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    className="px-6 py-2 bg-red-700 hover:bg-red-600 border border-red-600 rounded-lg font-medium text-sm transition-colors duration-200"
                  >
                    Stop Processing
                  </button>
                )}
              </div>
            )}
          </div>


        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .slider {
          transition: none;
          will-change: auto;
        }
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 0 0 2px #1f2937;
          transition: none;
          will-change: transform;
        }
        .slider::-webkit-slider-track {
          background: #374151;
          border-radius: 8px;
          transition: none;
        }
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 0 2px #1f2937;
          transition: none;
        }
        .slider::-moz-range-track {
          background: #374151;
          border-radius: 8px;
          transition: none;
        }
        /* Optimize for mobile touch */
        @media (max-width: 640px) {
          .slider::-webkit-slider-thumb {
            height: 20px;
            width: 20px;
          }
          .slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
          }
        }
      `}</style>
    </div>
  );
}