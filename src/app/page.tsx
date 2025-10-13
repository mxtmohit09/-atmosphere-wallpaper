"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import CanvasRenderer from "../components/CanvasRenderer";
import { BLUR_SETTINGS } from "../constants/blurSettings";
import { generateRandomColorPalette } from "../utils/randomColorGenerator";
import { DISPLACEMENT_MAPS } from "../constants/displacementMaps";

export default function Page() {
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
  
  // Custom displacement map controls
  const [displacementMap, setDisplacementMap] = useState<string | null>(null);
  const [displacementEnabled, setDisplacementEnabled] = useState(false);
  const [displacementIntensity, setDisplacementIntensity] = useState(20);
  
  // Optimized handlers with requestAnimationFrame for smoother updates
  const blurTimeout = useRef<NodeJS.Timeout | null>(null);
  const sizeTimeout = useRef<NodeJS.Timeout | null>(null);
  
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
    setHasUsedRandom(false); // Reset the flag when uploading a new file
    // Reset custom colors ref
    customColorsRef.current = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
    setCustomColors(['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']);
    createDownloadCanvasRef.current = null; // Reset download function
    setDownloadFunctionReady(false);
    // Initialize canvas values
    setCanvasBlur(blur);
    setCanvasSize(size);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 relative group">
            <span className="bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent tracking-wide">
              Abstract
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
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                {/* Upload Button */}
                <label className="group cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg transition-colors duration-200 flex-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="font-medium text-sm">Upload Image</span>
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
                
                {/* Generate Random Button */}
                <button
                  onClick={handleRandomGenerate}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 border border-orange-500 rounded-lg transition-all duration-200 flex-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="font-medium text-sm">Generate Random wallpaper</span>
                </button>
              </div>
              
              {file && (
                <div className="text-center">
                  <p className="text-xs text-gray-400">Selected: {file.name}</p>
                </div>
              )}
              
              {isRandomMode && randomColors.length > 0 && (
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-2">Random color palette:</p>
                  <div className="flex gap-2 justify-center">
                    {randomColors.map((color, index) => (
                      <div
                        key={index}
                        className="w-6 h-6 rounded-full border border-gray-600"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pick Colors Button - Only show after random generation has been used */}
          {hasUsedRandom && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-gray-700/50">
              <div className="text-center">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 border border-green-500 rounded-lg transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                  </svg>
                  <span className="font-medium text-sm">
                    {showColorPicker ? 'Hide Color Picker' : 'Pick Colors'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Custom Color Picker Section - Only show when showColorPicker is true */}
          {showColorPicker && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-gray-700/50">
              <div className="text-center mb-4">
                <h3 className="text-base font-semibold mb-2">Custom Colors</h3>
                <p className="text-xs text-gray-400">Choose your own 4 colors</p>
              </div>
              
              <div className="flex flex-col items-center gap-4">
                {/* Color Picker Grid */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                  {customColors.map((color, index) => (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-gray-600 cursor-pointer hover:border-gray-400 transition-colors"
                        style={{ backgroundColor: color }}
                      />
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => handleColorChange(index, e.target.value)}
                        className="w-full h-8 rounded border border-gray-600 bg-gray-700 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
                
                {/* Generate Custom Button */}
                <button
                  onClick={handleCustomGenerate}
                  disabled={isProcessing}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 border border-green-500 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing && isCustomMode ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                    </svg>
                  )}
                  <span className="font-medium text-sm">
                    {isProcessing && isCustomMode ? 'Generating...' : 'Generate Custom'}
                  </span>
                </button>
              </div>
            </div>
          )}
          
          {/* Show custom colors preview when in custom mode */}
          {isCustomMode && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-gray-700/50">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-2">Custom color palette:</p>
                <div className="flex gap-2 justify-center">
                  {customColors.map((color, index) => (
                    <div
                      key={index}
                      className="w-6 h-6 rounded-full border border-gray-600"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

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
                blurPx={canvasBlur}
                sizeMultiplier={canvasSize}
                shouldGenerate={shouldGenerate}
                isRandomMode={isRandomMode}
                randomColors={randomColors}
                isCustomMode={isCustomMode}
                customColors={customColors}
                displacementMap={displacementMap}
                displacementEnabled={displacementEnabled}
                displacementIntensity={displacementIntensity}
                onCanvasRef={useCallback((c: HTMLCanvasElement | null) => canvasRef.current = c, [])}
                onGenerated={handleGenerationComplete}
                onProcessingChange={setIsProcessing}
                onDownloadCanvasReady={handleDownloadCanvasReady}
                onCanvasReady={setCanvasReady}
              />
              {isProcessing && (
                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs z-10">
                  Generating...
                </div>
              )}
              
              
              {/* Download Button Overlay - appears after generation and download function is ready */}
              {generatedUrl && downloadFunctionReady && (
                <button
                  onClick={() => {
                    const downloadFunc = createDownloadCanvasRef.current;
                    
                    if (!downloadFunc || typeof downloadFunc !== 'function') {
                      return;
                    }
                    
                    try {
                      const blurValue = canvasBlur ?? 50; // Use default value if canvasBlur is null
                      const downloadCanvas = downloadFunc(blurValue);
                      const link = document.createElement("a");
                      link.download = `atmosphere_wallpaper_${resolution.w}x${resolution.h}.png`;
                      link.href = downloadCanvas.toDataURL("image/png");
                      link.click();
                    } catch {
                      // Silent error handling for production
                    }
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
              
              {/* Mobile Controls Overlay - Bottom (only visible on mobile) */}
              <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-sm rounded-lg p-2 z-20 md:hidden">
                <div className="grid grid-cols-2 gap-3">
                  {/* Blur Control */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-300">Blur</label>
                      <span className="text-xs font-mono bg-gray-700 px-1 py-0.5 rounded text-white">{blur}%</span>
                    </div>
                    <input 
                      type="range" 
                      min={0} 
                      max={100} 
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

                  {/* Displacement Map (Mobile) */}
                  <div className="col-span-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-300">Displacement</label>
                      <button
                        onClick={() => setDisplacementEnabled(!displacementEnabled)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          displacementEnabled ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {displacementEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <select
                      value={displacementMap || ''}
                      onChange={(e) => {
                        const value = e.target.value || null;
                        setDisplacementMap(value);
                        if (value) setDisplacementEnabled(true);
                      }}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-[12px] text-white"
                    >
                      {DISPLACEMENT_MAPS.map((map) => (
                        <option key={map.value || 'none'} value={map.value || ''}>
                          {map.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Displacement Intensity (Mobile) */}
                  {displacementMap && displacementEnabled && (
                    <div className="col-span-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-300">Distort</label>
                        <span className="text-xs font-mono bg-gray-700 px-1 py-0.5 rounded text-white">{displacementIntensity}%</span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={100}
                        value={displacementIntensity}
                        onChange={(e) => setDisplacementIntensity(Number(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Generate Button - below canvas (only for uploaded images) */}
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
            
            {/* Stop Button for Random and Custom Modes */}
            {(isRandomMode || isCustomMode) && isProcessing && (
              <div className="mt-3 text-center">
                <button
                  onClick={handleStop}
                  className="px-6 py-2 bg-red-700 hover:bg-red-600 border border-red-600 rounded-lg font-medium text-sm transition-colors duration-200"
                >
                  Stop Processing
                </button>
              </div>
            )}
          </div>

          {/* Desktop Controls Section - only visible on desktop */}
          <div className="hidden md:block bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 mb-4 border border-gray-700/50">
            <h3 className="text-lg font-semibold mb-4">Adjust Settings</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Blur Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Blur Intensity</label>
                  <span className="text-sm font-mono bg-gray-700 px-2 py-1 rounded text-white">{blur}%</span>
                </div>
                <input 
                  type="range" 
                  min={0} 
                  max={100} 
                  value={blur} 
                  onChange={(e) => optimizedSetBlur(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <p className="text-xs text-gray-400">Higher values create more atmospheric blur</p>
              </div>

              {/* Size Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Element Size</label>
                  <span className="text-sm font-mono bg-gray-700 px-2 py-1 rounded text-white">{size}%</span>
                </div>
                <input 
                  type="range" 
                  min={50} 
                  max={150} 
                  value={size} 
                  onChange={(e) => optimizedSetSize(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <p className="text-xs text-gray-400">Adjust the size of atmospheric elements</p>
              </div>
            </div>
            
            {/* Displacement Map Section */}
            <div className="mt-8 pt-6 border-t border-gray-700/50">
              <h4 className="text-lg font-semibold mb-4 text-center">🎨 Displacement Effects</h4>
              
              <div className="max-w-md mx-auto">
                <div className="space-y-4">
                  {/* Displacement Map Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Displacement Map</label>
                    <select 
                      value={displacementMap || ''}
                      onChange={(e) => {
                        const value = e.target.value || null;
                        setDisplacementMap(value);
                        if (value) {
                          setDisplacementEnabled(true);
                        }
                      }}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {DISPLACEMENT_MAPS.map((map) => (
                        <option key={map.value || 'none'} value={map.value || ''}>
                          {map.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Displacement Controls */}
                  {displacementMap && (
                    <>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-300">Enable Displacement</label>
                        <button
                          onClick={() => setDisplacementEnabled(!displacementEnabled)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            displacementEnabled 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {displacementEnabled ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      
                      {displacementEnabled && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-gray-400">Intensity</label>
                            <span className="text-xs font-mono bg-gray-700 px-2 py-1 rounded text-white">{displacementIntensity}%</span>
                          </div>
                          <input 
                            type="range" 
                            min={5} 
                            max={100} 
                            value={displacementIntensity} 
                            onChange={(e) => setDisplacementIntensity(Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                          />
                          <p className="text-xs text-gray-400">Higher values create more dramatic distortion effects</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
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