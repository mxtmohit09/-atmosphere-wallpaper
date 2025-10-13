"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import ColorThief from "colorthief";
import { blurPercentToPixels } from "../constants/blurSettings";
import { generateBlobs } from "../utils/blobGenerator";

type Props = {
  file: File | null;
  width: number;
  height: number;
  blurPx?: number;
  sizeMultiplier?: number; // 50-150%
  shouldGenerate?: boolean;
  isRandomMode?: boolean;
  randomColors?: string[];
  isCustomMode?: boolean;
  customColors?: string[];
  displacementMap?: string | null;
  displacementEnabled?: boolean;
  displacementIntensity?: number;
  onCanvasRef?: (c: HTMLCanvasElement | null) => void;
  onGenerated?: (url: string) => void;
  onProcessingChange?: (processing: boolean) => void;
  onDownloadCanvasReady?: (createDownloadCanvas: (blurPercent: number) => HTMLCanvasElement) => void;
  onCanvasReady?: (ready: boolean) => void;
};

function brightness([r, g, b]: number[]) {
  return r + g + b;
}

// Memoized color conversion function for better performance
const colorCache = new Map<string, number[]>();
function hexToRgbOptimized(hex: string): number[] {
  if (colorCache.has(hex)) {
    return colorCache.get(hex)!;
  }
  
  const cleanHex = hex.slice(1); // Remove #
  const rgb = [
    parseInt(cleanHex.substr(0, 2), 16),
    parseInt(cleanHex.substr(2, 2), 16),
    parseInt(cleanHex.substr(4, 2), 16)
  ];
  
  colorCache.set(hex, rgb);
  return rgb;
}

// Create separate background and blob layers
function createLayeredGeneration(
  backgroundCanvas: HTMLCanvasElement,
  blobCanvas: HTMLCanvasElement,
  palette: number[][],
  width: number,
  height: number,
  sizeMultiplier: number = 100
) {
  const bgCtx = backgroundCanvas.getContext("2d")!;
  const blobCtx = blobCanvas.getContext("2d")!;
  
  // Enable anti-aliasing for smoother rendering
  bgCtx.imageSmoothingEnabled = true;
  bgCtx.imageSmoothingQuality = "high";
  blobCtx.imageSmoothingEnabled = true;
  blobCtx.imageSmoothingQuality = "high";
  
  // Clear both canvases
  bgCtx.clearRect(0, 0, width, height);
  blobCtx.clearRect(0, 0, width, height);
  
  // Get top 4 colors from palette
  const topColors = palette.slice(0, 4);
  
  // Find the darkest color for background
  const darkestColor = topColors.reduce((darkest, color) => 
    brightness(color) < brightness(darkest) ? color : darkest
  );
  
  // Fill background canvas with darkest color (solid, no blur)
  bgCtx.fillStyle = `rgb(${darkestColor[0]}, ${darkestColor[1]}, ${darkestColor[2]})`;
  bgCtx.fillRect(0, 0, width, height);
  
  // Create 5 blobs with specific sizes: 60%, 51%, 43%, 36%, 30% of canvas (reduced by 10%)
  const canvasSize = Math.max(width, height);
  const sizeMultiplierPercent = sizeMultiplier / 100; // Convert percentage to decimal
  const blobSizes = [
    canvasSize * 0.6 * sizeMultiplierPercent,  // 60% blob (reduced from 66.5%)
    canvasSize * 0.51 * sizeMultiplierPercent, // 51% blob (reduced from 57%)
    canvasSize * 0.43 * sizeMultiplierPercent, // 43% blob (reduced from 47.5%)
    canvasSize * 0.36 * sizeMultiplierPercent, // 36% blob (reduced from 40%)
    canvasSize * 0.3 * sizeMultiplierPercent   // 30% blob (new 5th blob)
  ];
  
  // Use the 4 brightest colors (excluding the darkest one used for background)
  const colorsForBlobs = topColors
    .filter(color => color !== darkestColor)
    .slice(0, 4);
  
  // Generate blobs using the improved blob generator
  generateBlobs(blobCtx, colorsForBlobs, blobSizes, width, height, sizeMultiplier);
}

function completeGeneration(
  canvas: HTMLCanvasElement,
  palette: number[][],
  width: number,
  height: number,
  blurPx: number,
  sizeMultiplier: number = 100
) {
  const ctx = canvas.getContext("2d")!;
  
  // Enable anti-aliasing for smoother rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Get top 4 colors from palette
  const topColors = palette.slice(0, 4);
  
  // Find the darkest color for background
  const darkestColor = topColors.reduce((darkest, color) => 
    brightness(color) < brightness(darkest) ? color : darkest
  );
  
  // Fill background with darkest color (this will be the solid background layer)
  ctx.fillStyle = `rgb(${darkestColor[0]}, ${darkestColor[1]}, ${darkestColor[2]})`;
  ctx.fillRect(0, 0, width, height);
  
  // Create 5 blobs with specific sizes: 60%, 51%, 43%, 36%, 30% of canvas (reduced by 10%)
  const canvasSize = Math.max(width, height);
  const sizeMultiplierPercent = sizeMultiplier / 100; // Convert percentage to decimal
  const blobSizes = [
    canvasSize * 0.6 * sizeMultiplierPercent,  // 60% blob (reduced from 66.5%)
    canvasSize * 0.51 * sizeMultiplierPercent, // 51% blob (reduced from 57%)
    canvasSize * 0.43 * sizeMultiplierPercent, // 43% blob (reduced from 47.5%)
    canvasSize * 0.36 * sizeMultiplierPercent, // 36% blob (reduced from 40%)
    canvasSize * 0.3 * sizeMultiplierPercent   // 30% blob (new 5th blob)
  ];
  
  // Use the 4 brightest colors (excluding the darkest one used for background)
  const colorsForBlobs = topColors
    .filter(color => color !== darkestColor)
    .slice(0, 4);
  
  // Generate blobs using the improved blob generator
  generateBlobs(ctx, colorsForBlobs, blobSizes, width, height, sizeMultiplier);
  
  // Apply smooth blur to blend the blobs together
  const blurPixels = blurPercentToPixels(blurPx);
  
  if (blurPixels > 0) {
    ctx.filter = `blur(${blurPixels}px)`;
  } else {
    ctx.filter = "none";
  }
  
  // Apply a subtle overlay to smooth out any remaining artifacts
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(0, 0, width, height);
  
  ctx.filter = "none";
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

// Apply displacement map effect with multiple passes for stronger effect
function applyDisplacementMap(
  ctx: CanvasRenderingContext2D,
  displacementMap: HTMLImageElement,
  intensity: number,
  width: number,
  height: number
): void {
  console.log('Starting displacement map application...');
  
  // Create temporary canvas for displacement
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;
  
  // Copy current canvas content
  tempCtx.drawImage(ctx.canvas, 0, 0);
  
  // Get image data from both canvases
  const sourceImageData = tempCtx.getImageData(0, 0, width, height);
  const sourceData = sourceImageData.data;
  
  // Create displacement map canvas
  const displacementCanvas = document.createElement('canvas');
  displacementCanvas.width = width;
  displacementCanvas.height = height;
  const displacementCtx = displacementCanvas.getContext('2d')!;
  
  // Draw displacement map scaled to canvas size
  displacementCtx.drawImage(displacementMap, 0, 0, width, height);
  const displacementImageData = displacementCtx.getImageData(0, 0, width, height);
  const displacementData = displacementImageData.data;
  
  // Create new image data for result
  const resultImageData = ctx.createImageData(width, height);
  const resultData = resultImageData.data;
  
  // Scale intensity to pixels (intensity is percentage, scale to maximum strong pixel range)
  const pixelIntensity = (intensity / 100) * 500; // Max 500 pixels displacement for maximum strong effect
  
  // Apply displacement with multiple sampling for smoother, stronger effect
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sourceIndex = (y * width + x) * 4;
      const displacementIndex = (y * width + x) * 4;
      
      // Get displacement values (grayscale, so use red channel)
      const displacementX = (displacementData[displacementIndex] - 128) / 128; // -1 to 1
      const displacementY = (displacementData[displacementIndex + 1] - 128) / 128; // -1 to 1
      
      // Apply maximum strong displacement with maximum variation
      const enhancedIntensity = pixelIntensity * (1.0 + Math.random() * 1.0); // 1.0 to 2.0 multiplier for maximum strong effect
      
      // Calculate new position with enhanced intensity
      const newX = Math.max(0, Math.min(width - 1, x + displacementX * enhancedIntensity));
      const newY = Math.max(0, Math.min(height - 1, y + displacementY * enhancedIntensity));
      
      // Sample from source at displaced position with bilinear interpolation for smoother result
      const x1 = Math.floor(newX);
      const y1 = Math.floor(newY);
      const x2 = Math.min(width - 1, x1 + 1);
      const y2 = Math.min(height - 1, y1 + 1);
      
      const fx = newX - x1;
      const fy = newY - y1;
      
      // Get the four surrounding pixels
      const p1 = (y1 * width + x1) * 4;
      const p2 = (y1 * width + x2) * 4;
      const p3 = (y2 * width + x1) * 4;
      const p4 = (y2 * width + x2) * 4;
      
      // Bilinear interpolation for each color channel
      for (let c = 0; c < 3; c++) {
        const val1 = sourceData[p1 + c] * (1 - fx) + sourceData[p2 + c] * fx;
        const val2 = sourceData[p3 + c] * (1 - fx) + sourceData[p4 + c] * fx;
        resultData[sourceIndex + c] = val1 * (1 - fy) + val2 * fy;
      }
      
      // Keep alpha channel
      resultData[sourceIndex + 3] = sourceData[sourceIndex + 3];
    }
  }
  
  // Draw result back to canvas
  ctx.putImageData(resultImageData, 0, 0);
  console.log('Displacement map application completed with enhanced intensity');
}

export default function CanvasRenderer({
  file,
  width,
  height,
  blurPx = 50,
  sizeMultiplier = 100,
  shouldGenerate = false,
  isRandomMode = false,
  randomColors = [],
  isCustomMode = false,
  customColors = [],
  displacementMap = null,
  displacementEnabled = false,
  displacementIntensity = 20,
  onCanvasRef,
  onGenerated,
  onProcessingChange,
  onDownloadCanvasReady,
  onCanvasReady,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const customColorsRef = useRef(customColors);

  // Update ref when customColors changes
  useEffect(() => {
    customColorsRef.current = customColors;
  }, [customColors]);

  // Callback ref to ensure canvas is properly set
  const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    const ready = !!node;
    setCanvasReady(ready);
    onCanvasRef?.(node);
    onCanvasReady?.(ready);
  }, [onCanvasRef, onCanvasReady]);


  // Handle file changes and image loading
  useEffect(() => {
    if (!file) {
      // clear canvas
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, c.width, c.height);
      }
      setIsProcessing(false);
      setCurrentImage(null);
      setHasGenerated(false);
      onProcessingChange?.(false);
      return;
    }

    // Load and display the image
    const img = new Image();
    img.onload = () => {
      setCurrentImage(img);
      
    const c = canvasRef.current;
    if (c) {
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d")!;
        
        // Draw the uploaded image to canvas with proper scaling
        ctx.clearRect(0, 0, c.width, c.height);
        
        // Calculate scaling to fit image in canvas while maintaining aspect ratio
        const imgAspect = img.width / img.height;
        const canvasAspect = c.width / c.height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (imgAspect > canvasAspect) {
          // Image is wider than canvas
          drawWidth = c.width;
          drawHeight = c.width / imgAspect;
          drawX = 0;
          drawY = (c.height - drawHeight) / 2;
        } else {
          // Image is taller than canvas
          drawHeight = c.height;
          drawWidth = c.height * imgAspect;
          drawX = (c.width - drawWidth) / 2;
          drawY = 0;
        }
        
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      }
      };
    
      img.onerror = (e) => {
        // Image load error - handle silently
      };
    
      img.src = URL.createObjectURL(file);
  }, [file, width, height, onProcessingChange]);

  // Store the separate background and blob canvases for real-time blur updates
  const [backgroundCanvas, setBackgroundCanvas] = useState<HTMLCanvasElement | null>(null);
  const [blobCanvas, setBlobCanvas] = useState<HTMLCanvasElement | null>(null);
  const [noiseTexture, setNoiseTexture] = useState<HTMLImageElement | null>(null);
  const [displacementMapImage, setDisplacementMapImage] = useState<HTMLImageElement | null>(null);

  // Load noise texture on component mount
  useEffect(() => {
    const loadNoiseTexture = () => {
      const img = new Image();
      img.onload = () => {
        setNoiseTexture(img);
      };
      img.onerror = () => {
        setNoiseTexture(null);
      };
      img.src = '/noisemap.png';
    };
    
    loadNoiseTexture();
  }, []);

  // Load displacement map when path changes
  useEffect(() => {
    if (!displacementMap) {
      setDisplacementMapImage(null);
      return;
    }

    const loadDisplacementMap = () => {
      console.log('Loading displacement map:', displacementMap);
      const img = new Image();
      img.onload = () => {
        console.log('Displacement map loaded successfully:', displacementMap);
        setDisplacementMapImage(img);
      };
      img.onerror = () => {
        setDisplacementMapImage(null);
        console.warn(`Failed to load displacement map: ${displacementMap}`);
      };
      img.src = displacementMap;
    };
    
    loadDisplacementMap();
  }, [displacementMap]);

  // Handle generation when shouldGenerate changes
  useEffect(() => {
    if (!shouldGenerate || !canvasReady) {
      setIsProcessing(false);
      onProcessingChange?.(false);
      return;
    }
    
    // For image mode, we need both file and currentImage
    if (!isRandomMode && !isCustomMode && (!file || !currentImage)) {
      setIsProcessing(false);
      onProcessingChange?.(false);
      return;
    }
    
    // For random mode, we need randomColors
    if (isRandomMode && randomColors.length === 0) {
      setIsProcessing(false);
      onProcessingChange?.(false);
      return;
    }
    
    // For custom mode, we need customColors
    if (isCustomMode && customColors.length === 0) {
      setIsProcessing(false);
      onProcessingChange?.(false);
      return;
    }

    setIsProcessing(true);
    onProcessingChange?.(true);
    
    // Add timeout to prevent infinite processing
    const timeoutId = setTimeout(() => {
      setIsProcessing(false);
      onProcessingChange?.(false);
    }, 8000); // Reduced to 8 seconds for faster feedback

    const generateAtmosphere = async () => {
        try {
          const c = canvasRef.current;
          if (!c) {
            clearTimeout(timeoutId);
            setIsProcessing(false);
            onProcessingChange?.(false);
            return;
          }

          let palette: number[][] = [];
        
          if (isRandomMode && randomColors.length > 0) {
            // Use provided random colors - optimized conversion with caching
            palette = randomColors.map(color => hexToRgbOptimized(color));
          } else if (isCustomMode && customColorsRef.current.length > 0) {
            // Use provided custom colors - optimized conversion with caching
            palette = customColorsRef.current.map(color => hexToRgbOptimized(color));
          } else if (currentImage) {
            // Extract colors from uploaded image
            const ct = new ColorThief();
            try {
              palette = ct.getPalette(currentImage, 5) as number[][];
            } catch {
              // fallback: sample approximate colors if ColorThief fails
              palette = [[30,30,30],[90,80,120],[200,180,160],[220,220,210],[120,90,70]];
            }
          } else {
            // No image and no random colors - use fallback
            palette = [[30,30,30],[90,80,120],[200,180,160],[220,220,210],[120,90,70]];
          }

          // sort by brightness (darkest first)
          palette.sort((a,b) => brightness(a) - brightness(b));
          
          c.width = width;
          c.height = height;
          const ctx = c.getContext("2d")!;
          if (!ctx) {
          clearTimeout(timeoutId);
          setIsProcessing(false);
          onProcessingChange?.(false);
          return;
        }
          
          
          // Show processing message
          ctx.fillStyle = "rgba(0,0,0,0.8)";
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = "white";
          ctx.font = "bold 24px Arial";
          ctx.fillText("🎨 Generating atmosphere...", 20, 50);
          
        // Wait a moment to show the message, then complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create separate background and blob canvases for layered rendering
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = width;
        bgCanvas.height = height;
        
        const blobCanvas = document.createElement('canvas');
        blobCanvas.width = width;
        blobCanvas.height = height;
        
        // Generate the atmospheric wallpaper
        createLayeredGeneration(bgCanvas, blobCanvas, palette, width, height, sizeMultiplier);
        setBackgroundCanvas(bgCanvas);
        setBlobCanvas(blobCanvas);
        applyBlurToCanvas(c, bgCanvas, blobCanvas, blurPx);
            
            // export url for preview link
            const url = c.toDataURL("image/png");
            onGenerated?.(url);
            
            // Set up download function immediately after generation is complete
            if (onDownloadCanvasReady) {
              const downloadFunction = (blurPercent: number) => {
                // Handle null/undefined blurPercent
                if (blurPercent == null) {
                  blurPercent = 50;
                }
                
                // Use the exact same canvas that was generated for preview
                const downloadCanvas = document.createElement('canvas');
                downloadCanvas.width = c.width;
                downloadCanvas.height = c.height;
                const ctx = downloadCanvas.getContext("2d")!;
                
                // Enable high-quality rendering
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                
                // Draw the exact same content as the preview canvas
                ctx.drawImage(c, 0, 0);
                
                // Apply additional noise texture overlay for download (on top of existing noise)
                if (noiseTexture) {
                  ctx.globalCompositeOperation = "overlay";
                  ctx.globalAlpha = 0.4; // Additional 40% noise on top of existing 30% = 70% total
                  ctx.drawImage(noiseTexture, 0, 0, downloadCanvas.width, downloadCanvas.height);
                  ctx.globalCompositeOperation = "source-over";
                  ctx.globalAlpha = 1;
                }
                
                return downloadCanvas;
              };
              onDownloadCanvasReady(downloadFunction);
            }
            
            clearTimeout(timeoutId);
            setIsProcessing(false);
        setHasGenerated(true);
            onProcessingChange?.(false);

        } catch (err) {
          clearTimeout(timeoutId);
          setIsProcessing(false);
          onProcessingChange?.(false);
          
          // Fallback: show original image
          const c = canvasRef.current;
        if (c && currentImage) {
            const ctx = c.getContext("2d");
            if (ctx) {
              c.width = width;
              c.height = height;
            ctx.drawImage(currentImage, 0, 0, width, height);
          }
        }
      }
    };

    generateAtmosphere();

    // cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
    };
  }, [shouldGenerate, currentImage, file, width, height, sizeMultiplier, onGenerated, isRandomMode, randomColors, isCustomMode, canvasReady]);

  // Apply blur to canvas in real-time with separate background and blob layers
  const applyBlurToCanvas = useCallback((targetCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement, blobCanvas: HTMLCanvasElement, blurPercent: number) => {
    const ctx = targetCanvas.getContext("2d")!;
    
    // Enable anti-aliasing for smoother rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    
    // First, draw the solid background (no blur)
    ctx.drawImage(backgroundCanvas, 0, 0);
    
    // Then, draw the blurred blobs on top
    const blurPixels = blurPercentToPixels(blurPercent);
    ctx.filter = `blur(${blurPixels}px)`;
    
    ctx.drawImage(blobCanvas, 0, 0);
    ctx.filter = "none";
    
    // Apply displacement map if enabled and available
    if (displacementEnabled && displacementMapImage && displacementIntensity > 0) {
      try {
        console.log('Applying displacement map:', displacementMap, 'intensity:', displacementIntensity);
        applyDisplacementMap(ctx, displacementMapImage, displacementIntensity, targetCanvas.width, targetCanvas.height);
      } catch (error) {
        console.warn('Displacement map effect failed:', error);
      }
    } else {
      console.log('Displacement not applied:', {
        displacementEnabled,
        hasDisplacementMapImage: !!displacementMapImage,
        displacementIntensity
      });
    }
    
    // Apply noise texture overlay if available (preview version - lighter)
    if (noiseTexture) {
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.3; // 30% opacity for preview
      ctx.drawImage(noiseTexture, 0, 0, targetCanvas.width, targetCanvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
  }, [noiseTexture, displacementEnabled, displacementMapImage, displacementIntensity]);

  // Create download version with stronger noise and effects
  const createDownloadCanvas = useCallback((targetCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement, blobCanvas: HTMLCanvasElement, blurPercent: number) => {
    const downloadCanvas = document.createElement('canvas');
    downloadCanvas.width = targetCanvas.width;
    downloadCanvas.height = targetCanvas.height;
    const ctx = downloadCanvas.getContext("2d")!;
    
    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    
    // Draw the exact same content as the target canvas (preview)
    ctx.drawImage(targetCanvas, 0, 0);
    
    // Apply displacement map for download (same as preview)
    if (displacementEnabled && displacementMapImage && displacementIntensity > 0) {
      try {
        applyDisplacementMap(ctx, displacementMapImage, displacementIntensity, downloadCanvas.width, downloadCanvas.height);
      } catch (error) {
        console.warn('Download displacement map effect failed:', error);
      }
    }
    
    // Apply additional noise texture overlay for download (on top of existing noise)
    if (noiseTexture) {
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.4; // Additional 40% noise on top of existing 30% = 70% total
      ctx.drawImage(noiseTexture, 0, 0, downloadCanvas.width, downloadCanvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
    
    return downloadCanvas;
  }, [noiseTexture, displacementEnabled, displacementMapImage, displacementIntensity]);

  // Handle real-time blur updates with immediate response
  useEffect(() => {
    if (backgroundCanvas && blobCanvas && hasGenerated) {
      const c = canvasRef.current;
      if (c) {
        // Immediate canvas update for smooth slider feedback
        applyBlurToCanvas(c, backgroundCanvas, blobCanvas, blurPx);
      }
    }
  }, [blurPx, backgroundCanvas, blobCanvas, hasGenerated, applyBlurToCanvas]);

  // Handle real-time size updates with immediate response
  useEffect(() => {
    if (hasGenerated && (currentImage || isRandomMode || isCustomMode)) {
      const c = canvasRef.current;
      if (c) {
        // Immediate size update for smooth slider feedback
        // Regenerate the layered canvases with new size
        const newBgCanvas = document.createElement('canvas');
        newBgCanvas.width = width;
        newBgCanvas.height = height;
        
        const newBlobCanvas = document.createElement('canvas');
        newBlobCanvas.width = width;
        newBlobCanvas.height = height;
        
        // Get colors - either from image, random colors, or custom colors
        let palette: number[][];
        if (isRandomMode && randomColors.length > 0) {
          // Use provided random colors - optimized conversion with caching
          palette = randomColors.map(color => hexToRgbOptimized(color));
        } else if (isCustomMode && customColorsRef.current.length > 0) {
          // Use provided custom colors - optimized conversion with caching
          palette = customColorsRef.current.map(color => hexToRgbOptimized(color));
        } else if (currentImage) {
          // Extract colors from current image
          const colorThief = new ColorThief();
          palette = colorThief.getPalette(currentImage, 4);
        } else {
          // Fallback
          palette = [[30,30,30],[90,80,120],[200,180,160],[220,220,210]];
        }
        
        // Generate new layered canvases with updated size
        createLayeredGeneration(newBgCanvas, newBlobCanvas, palette, width, height, sizeMultiplier);
        setBackgroundCanvas(newBgCanvas);
        setBlobCanvas(newBlobCanvas);
        
        // Apply current blur to the new layered canvases
        applyBlurToCanvas(c, newBgCanvas, newBlobCanvas, blurPx);
      }
    }
  }, [sizeMultiplier, hasGenerated, currentImage, width, height, applyBlurToCanvas, isRandomMode, randomColors, isCustomMode]);

  // Download function is now set up directly in the generation completion

  return (
    <div className="w-full flex justify-center items-center">
      {!file && !isRandomMode && !isCustomMode ? (
        <div className="flex flex-col items-center justify-center text-gray-500 py-12">
          <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium mb-2">No Image Selected</p>
          <p className="text-sm text-gray-400">Upload an image to generate your atmosphere wallpaper</p>
        </div>
      ) : (
        <div className="w-full max-w-[420px] relative">
          <canvas 
            ref={setCanvasRef} 
            className="rounded-2xl border border-gray-600/30 shadow-2xl" 
            style={{ 
              width: "100%",
              height: "auto",
              maxWidth: "400px",
              aspectRatio: `${width}/${height}`
            }} 
          />
          {!shouldGenerate && !isProcessing && currentImage && !hasGenerated && (
            <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-sm text-white font-medium">Ready to Generate</p>
                <p className="text-xs text-gray-300">Click &quot;Generate Atmosphere&quot;</p>
              </div>
            </div>
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 mx-auto mb-2 border-2 border-white border-t-transparent rounded-full"></div>
                <p className="text-sm text-white font-medium">Generating...</p>
                <p className="text-xs text-gray-300">Please wait</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}