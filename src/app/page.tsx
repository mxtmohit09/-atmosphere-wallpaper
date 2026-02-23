"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import CanvasRenderer from "../components/CanvasRenderer";
import { BLUR_SETTINGS } from "../constants/blurSettings";
import { generateRandomColorPalette } from "../utils/randomColorGenerator";
import { DISPLACEMENT_MAPS } from "../constants/displacementMaps";

export default function Page() {
  const [mode, setMode] = useState<'atmospheric' | 'displacement'>('atmospheric');
  const [file, setFile] = useState<File | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [blur, setBlur] = useState<number>(BLUR_SETTINGS.DEFAULT_BLUR_PERCENT);
  const [size, setSize] = useState(100);
  const [canvasBlur, setCanvasBlur] = useState<number>(BLUR_SETTINGS.DEFAULT_BLUR_PERCENT);
  const [canvasSize, setCanvasSize] = useState(100); // Debounced size for canvas
  const [resolution, setResolution] = useState({ w: 1260, h: 2800 });
  const [shouldGenerate, setShouldGenerate] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [randomColors, setRandomColors] = useState<string[]>([]);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customColors, setCustomColors] = useState<string[]>(['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']);
  const customColorsRef = useRef<string[]>(['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']);
  const colorUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hasUsedRandom, setHasUsedRandom] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const createDownloadCanvasRef = useRef<((blurPercent: number) => HTMLCanvasElement) | null>(null);
  const [downloadFunctionReady, setDownloadFunctionReady] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Full-resolution dimensions passed to the canvas renderer
  // The canvas is CSS-scaled inside the 320px preview box, so there's no quality loss
  const fullResWidth = resolution.w;
  const fullResHeight = mode === 'displacement' && imageAspectRatio
    ? Math.round(resolution.w / imageAspectRatio)
    : resolution.h;

  // Custom displacement map controls
  const [displacementMap, setDisplacementMap] = useState<string | null>('/displacement-maps/glass1.png');
  const [displacementEnabled, setDisplacementEnabled] = useState(false);
  const [displacementIntensity, setDisplacementIntensity] = useState(20);
  const [canvasDisplacementIntensity, setCanvasDisplacementIntensity] = useState(20); // Debounced intensity for canvas

  // Optimized handlers with requestAnimationFrame for smoother updates
  const blurTimeout = useRef<NodeJS.Timeout | null>(null);
  const sizeTimeout = useRef<NodeJS.Timeout | null>(null);
  const displacementTimeout = useRef<NodeJS.Timeout | null>(null);

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
    }, 250);
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
    }, 250);
  }, []);

  const optimizedSetDisplacementIntensity = useCallback((value: number) => {
    // Immediate visual feedback for slider
    setDisplacementIntensity(value);

    // Debounced canvas update - displacement is expensive, so use shorter delay
    if (displacementTimeout.current) {
      clearTimeout(displacementTimeout.current);
    }
    displacementTimeout.current = setTimeout(() => {
      setCanvasDisplacementIntensity(value);
    }, 30);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;

    // Clear any pending color updates
    if (colorUpdateTimeout.current) {
      clearTimeout(colorUpdateTimeout.current);
    }

    setFile(f);
    setGeneratedUrl(null);
    setShouldGenerate(false);
    setIsRandomMode(false);
    setIsCustomMode(false);
    setRandomColors([]);
    setShowColorPicker(false);
    setHasUsedRandom(false);
    // Reset custom colors ref
    customColorsRef.current = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
    setCustomColors(['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']);
    createDownloadCanvasRef.current = null;
    setDownloadFunctionReady(false);
    // Initialize canvas values
    setCanvasBlur(blur);
    setCanvasSize(size);

    // Get image aspect ratio
    if (f) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImageAspectRatio(img.width / img.height);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(f);
    } else {
      setImageAspectRatio(null);
    }
  };

  const handleModeChange = (newMode: 'atmospheric' | 'displacement') => {
    setMode(newMode);
    // Keep the uploaded file and other state when switching modes
    setGeneratedUrl(null);
    setShouldGenerate(false);
    setIsProcessing(false);
    createDownloadCanvasRef.current = null;
    setDownloadFunctionReady(false);

    // Reset mode-specific settings to prevent effect carryover
    if (newMode === 'displacement') {
      // Glass mode - reset to defaults
      setDisplacementEnabled(true);
      setDisplacementIntensity(20);
      setCanvasDisplacementIntensity(20);
    } else {
      // Atmospheric mode - reset displacement to neutral
      setDisplacementEnabled(false);
      setDisplacementIntensity(20);
      setCanvasDisplacementIntensity(20);
    }
  };


  const handleColorChange = (index: number, color: string) => {
    // Update ref immediately for instant feedback
    customColorsRef.current[index] = color;

    // Debounced state update to reduce re-renders
    if (colorUpdateTimeout.current) {
      clearTimeout(colorUpdateTimeout.current);
    }
    colorUpdateTimeout.current = setTimeout(() => {
      setCustomColors([...customColorsRef.current]);
    }, 100); // Very short delay for smooth UX
  };

  const handleRandomGenerate = () => {
    const colors = generateRandomColorPalette();

    // Clear any pending color updates
    if (colorUpdateTimeout.current) {
      clearTimeout(colorUpdateTimeout.current);
    }

    setFile(null); // Clear any uploaded file
    setGeneratedUrl(null);
    setIsRandomMode(true);
    setIsCustomMode(false);
    setRandomColors(colors);
    setShowColorPicker(false);
    setHasUsedRandom(true); // Mark that random generation has been used
    createDownloadCanvasRef.current = null;
    setDownloadFunctionReady(false);
    // Initialize canvas values
    setCanvasBlur(blur);
    setCanvasSize(size);

    // Start generation immediately - the useEffect will wait for canvas to be ready
    setShouldGenerate(true);
  };

  const handleCustomGenerate = () => {
    // Update state with current ref values
    setCustomColors([...customColorsRef.current]);

    setFile(null); // Clear any uploaded file
    setGeneratedUrl(null);
    setIsCustomMode(true);
    setIsRandomMode(false);
    setShowColorPicker(false); // Hide color picker after generation
    createDownloadCanvasRef.current = null;
    setDownloadFunctionReady(false);
    // Initialize canvas values
    setCanvasBlur(blur);
    setCanvasSize(size);

    // Start generation immediately - the useEffect will wait for canvas to be ready
    setShouldGenerate(true);
  };

  const handleGenerate = () => {
    if (file) {
      setShouldGenerate(true);
      setGeneratedUrl(null);
      // Don't reset download function during generation - keep the previous one if available
    }
  };

  const handleStop = () => {
    setShouldGenerate(false);
    setIsProcessing(false);
  };

  const handleGenerationComplete = useCallback((url: string) => {
    setGeneratedUrl(url);
    setShouldGenerate(false); // Reset generation state
  }, []);

  const handleDownloadCanvasReady = useCallback((func: (blurPercent: number) => HTMLCanvasElement) => {
    if (typeof func !== 'function') {
      return;
    }

    // Store function in ref instead of state to prevent it from being called during renders
    createDownloadCanvasRef.current = func;
    setDownloadFunctionReady(true);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (colorUpdateTimeout.current) {
        clearTimeout(colorUpdateTimeout.current);
      }
    };
  }, []);

  // Initialize canvas values on component mount
  useEffect(() => {
    setCanvasBlur(blur);
    setCanvasSize(size);
  }, [blur, size]);

  // Initialize canvas values on component mount
  useEffect(() => {
    setCanvasBlur(blur);
    setCanvasSize(size);
  }, [blur, size]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="bg-gray-900/50 border-b border-gray-700/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Abstract Wallpaper
              </span>
            </h1>
            <p className="text-xs md:text-sm text-gray-400">Create stunning wallpapers</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-6">
        {/* Mode Selection - Fixed at top on mobile, inline on desktop */}
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            {/* Atmospheric Mode */}
            <button
              onClick={() => handleModeChange('atmospheric')}
              className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${mode === 'atmospheric'
                ? 'border-blue-500 bg-blue-900/30'
                : 'border-gray-600 bg-gray-700/20 hover:border-gray-500'
                }`}
            >
              <svg className="w-5 h-5 mx-auto mb-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              <p className="text-xs md:text-sm font-medium">Atmospheric</p>
            </button>

            {/* Glass Effects Mode */}
            <button
              onClick={() => handleModeChange('displacement')}
              className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${mode === 'displacement'
                ? 'border-purple-500 bg-purple-900/30'
                : 'border-gray-600 bg-gray-700/20 hover:border-gray-500'
                }`}
            >
              <svg className="w-5 h-5 mx-auto mb-1 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <p className="text-xs md:text-sm font-medium">Glass Effects</p>
            </button>
          </div>
        </div>

        {/* Main Layout - Side by side on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1 space-y-3 md:space-y-4 order-2 lg:order-1">
            {/* Browser Notice - Desktop only */}
            <div className="hidden md:block bg-blue-900/20 border border-blue-500/30 rounded-lg p-2 text-xs text-blue-300">
              ✓ All browsers supported including Safari with optimized rendering
            </div>

            {/* Upload Section */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 md:p-4">
              <p className="text-xs md:text-sm font-semibold mb-3">Upload</p>
              {mode === 'displacement' ? (
                <label className="flex flex-col items-center justify-center gap-2 px-3 py-4 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg cursor-pointer transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-xs md:text-sm">Select Image</span>
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
              ) : (
                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center gap-2 px-3 py-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg cursor-pointer transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-xs md:text-sm">Upload Image</span>
                    <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                  </label>
                  <button
                    onClick={handleRandomGenerate}
                    className="w-full px-3 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 border border-orange-500 rounded-lg transition-colors text-xs md:text-sm font-medium"
                  >
                    Random
                  </button>
                </div>
              )}
              {file && <p className="text-xs text-gray-400 mt-2">✓ {file.name.substring(0, 20)}</p>}
            </div>

            {/* Color Picker - Atmospheric only */}
            {mode === 'atmospheric' && hasUsedRandom && (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 md:p-4">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-full px-3 py-2 text-xs md:text-sm bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors mb-2"
                >
                  {showColorPicker ? 'Hide Colors' : 'Pick Colors'}
                </button>
                {showColorPicker && (
                  <div className="grid grid-cols-2 gap-2">
                    {customColors.map((color, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => handleColorChange(i, e.target.value)}
                          className="w-full h-8 rounded border border-gray-600 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Blur & Size Controls - Atmospheric only */}
            {mode === 'atmospheric' && (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 md:p-4 space-y-3">
                <p className="text-xs md:text-sm font-semibold">Effects</p>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-gray-300">Blur</label>
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded">{blur}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={blur}
                    onChange={(e) => optimizedSetBlur(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-gray-300">Size</label>
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded">{size}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    value={size}
                    onChange={(e) => optimizedSetSize(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Glass Effects Controls - Display in glass effects mode */}
            {mode === 'displacement' && (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 md:p-4 space-y-3">
                <p className="text-xs md:text-sm font-semibold">Glass Effects</p>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-gray-300">Blur</label>
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded">{blur}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={blur}
                    onChange={(e) => optimizedSetBlur(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>

                <select
                  value={displacementMap || ''}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    setDisplacementMap(value);
                    if (value) setDisplacementEnabled(true);
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-xs text-white"
                >
                  {DISPLACEMENT_MAPS.filter(map => map.value !== null).map((map) => (
                    <option key={map.value} value={map.value as string}>
                      {map.name}
                    </option>
                  ))}
                </select>

                {displacementMap && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-gray-300">Intensity</label>
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded">{displacementIntensity}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={displacementIntensity}
                      onChange={(e) => optimizedSetDisplacementIntensity(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Resolution Selector */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 md:p-4">
              <label className="text-xs md:text-sm font-semibold mb-2 block">Resolution</label>
              <select
                value={`${resolution.w}x${resolution.h}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split("x").map(Number);
                  setResolution({ w, h });
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-xs text-white"
              >
                <option value="1260x2800">Nothing Phone (1260×2800)</option>
                <option value="1080x2400">Phone (1080×2400)</option>
                <option value="1170x2532">iPhone (1170×2532)</option>
                <option value="1440x3120">Large (1440×3120)</option>
                <option value="720x1280">Small (720×1280)</option>
              </select>
            </div>

            {/* Generate Button */}
            <div className="pt-2">
              {file ? (
                !isProcessing ? (
                  <button
                    onClick={handleGenerate}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-sm transition-colors"
                  >
                    Generate
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-sm transition-colors"
                  >
                    Stop
                  </button>
                )
              ) : (
                (isRandomMode || isCustomMode) && (
                  <button
                    onClick={handleStop}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-sm transition-colors"
                  >
                    Stop
                  </button>
                )
              )}
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            {/* Preview Canvas */}
            <div className="bg-black/40 rounded-xl p-1 md:p-2 border border-gray-700/50 relative flex justify-center items-start">
              <div className="bg-black/60 rounded-lg flex items-center justify-center" style={{ width: '320px', aspectRatio: mode === 'displacement' && imageAspectRatio ? `${imageAspectRatio}` : `${resolution.w}/${resolution.h}` }}>
                <CanvasRenderer
                  file={file}
                  width={fullResWidth}
                  height={fullResHeight}
                  fullWidth={resolution.w}
                  fullHeight={resolution.h}
                  mode={mode}
                  blurPx={mode === 'displacement' ? blur : canvasBlur}
                  sizeMultiplier={canvasSize}
                  shouldGenerate={shouldGenerate}
                  isRandomMode={isRandomMode}
                  randomColors={randomColors}
                  isCustomMode={isCustomMode}
                  customColors={customColors}
                  displacementMap={displacementMap}
                  displacementEnabled={displacementEnabled}
                  displacementIntensity={mode === 'displacement' ? displacementIntensity : canvasDisplacementIntensity}
                  onCanvasRef={useCallback((c: HTMLCanvasElement | null) => canvasRef.current = c, [])}
                  onGenerated={handleGenerationComplete}
                  onProcessingChange={setIsProcessing}
                  onDownloadCanvasReady={handleDownloadCanvasReady}
                  onCanvasReady={setCanvasReady}
                />

                {isProcessing && (
                  <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                    Processing...
                  </div>
                )}
              </div>

              {/* Download Button */}
              {generatedUrl && downloadFunctionReady && (
                <button
                  onClick={async () => {
                    setIsDownloading(true);
                    try {
                      if (createDownloadCanvasRef.current) {
                        // Use the provided high-resolution generator function from CanvasRenderer
                        const currentBlur = mode === 'displacement' ? blur : canvasBlur;
                        const finalCanvas = createDownloadCanvasRef.current(currentBlur);

                        const link = document.createElement("a");
                        link.download = `wallpaper_${finalCanvas.width}x${finalCanvas.height}.png`;
                        link.href = finalCanvas.toDataURL("image/png");
                        link.click();
                      }
                    } catch (error) {
                      console.error("Download failed:", error);
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                  disabled={isDownloading}
                  className="absolute top-3 right-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-3 py-2 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {isDownloading ? 'Downloading...' : 'Download'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-700/50">
          <div className="text-center text-gray-400 text-sm">
            <p className="mb-2">© 2025 Atmosphere Wallpaper Generator</p>
            <div className="flex justify-center gap-6">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="https://www.x.com/mxtpixel" className="hover:text-white transition-colors">contact us on X (Twitter)</a>
            </div>
          </div>
        </footer>
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
