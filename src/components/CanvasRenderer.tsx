"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ColorThief from "colorthief";

type Props = {
  file: File | null;
  width: number;
  height: number;
  blurPx?: number;
  sizeMultiplier?: number; // 50-150%
  shouldGenerate?: boolean;
  onCanvasRef?: (c: HTMLCanvasElement | null) => void;
  onGenerated?: (url: string) => void;
  onProcessingChange?: (processing: boolean) => void;
};

function brightness([r, g, b]: number[]) {
  return r + g + b;
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
  
  // Clear canvas
    ctx.clearRect(0, 0, width, height);
  
  // Get top 4 colors from palette
  const topColors = palette.slice(0, 4);
  
  // Find the darkest color for background
  const darkestColor = topColors.reduce((darkest, color) => 
    brightness(color) < brightness(darkest) ? color : darkest
  );
  
  // Fill background with darkest color
  ctx.fillStyle = `rgb(${darkestColor[0]}, ${darkestColor[1]}, ${darkestColor[2]})`;
  ctx.fillRect(0, 0, width, height);
  
  // Create 3 blobs with specific sizes: 66.5%, 57%, 47.5% of canvas (-5% decrease)
  const canvasSize = Math.max(width, height);
  const sizeMultiplierPercent = sizeMultiplier / 100; // Convert percentage to decimal
  const blobSizes = [
    canvasSize * 0.665 * sizeMultiplierPercent, // 66.5% blob (70% - 5%)
    canvasSize * 0.57 * sizeMultiplierPercent, // 57% blob (60% - 5%)
    canvasSize * 0.475 * sizeMultiplierPercent  // 47.5% blob (50% - 5%)
  ];
  
  // Use the 3 brightest colors (excluding the darkest one used for background)
  const colorsForBlobs = topColors
    .filter(color => color !== darkestColor)
    .slice(0, 3);
  
  // Track blob positions to avoid complete overlap
  const blobPositions = [];
  
  for (let i = 0; i < 3; i++) {
    if (i >= colorsForBlobs.length) break;
    
    const color = colorsForBlobs[i];
    const baseBlobSize = blobSizes[i];
    
    // Random position around center area horizontally, but full vertical range
    const centerX = width * 0.5;
    const horizontalRange = width * 0.4; // 40% of width around center
    
    let x, y;
    let attempts = 0;
    const maxAttempts = 20; // Prevent infinite loop
    
    do {
      x = centerX + (Math.random() - 0.5) * horizontalRange;
      y = Math.random() * height; // Full vertical range
      attempts++;
      
      // Check if this position is too close to existing blobs
      let tooClose = false;
      for (const existingPos of blobPositions) {
        const distance = Math.sqrt((x - existingPos.x) ** 2 + (y - existingPos.y) ** 2);
        const minDistance = Math.min(baseBlobSize, existingPos.size) * 0.3; // 30% of smaller blob size
        
        if (distance < minDistance) {
          tooClose = true;
          break;
        }
      }
      
      // If not too close or max attempts reached, use this position
      if (!tooClose || attempts >= maxAttempts) {
        break;
      }
    } while (attempts < maxAttempts);
    
    // Store this blob's position and size for future checks
    blobPositions.push({ x, y, size: baseBlobSize });
    
    // Random size variation (±20% of base size)
    const sizeVariation = (Math.random() - 0.5) * 0.4; // -20% to +20%
    const blobSize = baseBlobSize * (1 + sizeVariation);
    
    // Create organic blob shape (not circular)
    const drawOrganicBlob = (centerX: number, centerY: number, targetSize: number) => {
      ctx.beginPath();
      
      // Calculate base radius
      const baseRadius = targetSize / 2;
      
      // Create simplified shape for better performance on slower devices
      const numPoints = 6; // Reduced points for better performance
      const points = [];
      
      // Pre-calculate random variations for better performance
      const radiusVariations = Array.from({length: numPoints}, () => 0.7 + Math.random() * 0.6);
      const offsetsX = Array.from({length: numPoints}, () => (Math.random() - 0.5) * baseRadius * 0.2);
      const offsetsY = Array.from({length: numPoints}, () => (Math.random() - 0.5) * baseRadius * 0.2);
      
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        
        // Use pre-calculated variations
        const pointRadius = baseRadius * radiusVariations[i];
        const offsetX = offsetsX[i];
        const offsetY = offsetsY[i];
        
        points.push({
          x: centerX + Math.cos(angle) * pointRadius + offsetX,
          y: centerY + Math.sin(angle) * pointRadius + offsetY
        });
      }
      
      // Draw the organic shape using curves
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 0; i < points.length; i++) {
        const currentPoint = points[i];
        const nextPoint = points[(i + 1) % points.length];
        
        // Calculate control point for smooth curve
        const midX = (currentPoint.x + nextPoint.x) / 2;
        const midY = (currentPoint.y + nextPoint.y) / 2;
        
        // Add some randomness to control point for organic curves
        const controlOffset = baseRadius * (0.1 + Math.random() * 0.3);
        const controlX = midX + (Math.random() - 0.5) * controlOffset;
        const controlY = midY + (Math.random() - 0.5) * controlOffset;
        
        // Draw quadratic curve to next point
        ctx.quadraticCurveTo(controlX, controlY, nextPoint.x, nextPoint.y);
      }
      
      ctx.closePath();
    };
    
    // Create single organic blob with 100% opacity and correct surface area
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`; // 100% opacity
    drawOrganicBlob(x, y, blobSize);
    ctx.fill();
  }
  
  // Apply blur to blend the blobs together with smoother boundaries
  ctx.filter = `blur(${blurPx}px)`;
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fillRect(0, 0, width, height);
  
  // Add a second, lighter blur pass for extra smoothness
  ctx.filter = `blur(${blurPx * 0.5}px)`;
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = "rgba(255,255,255,0.01)";
  ctx.fillRect(0, 0, width, height);
  
  ctx.filter = "none";
  ctx.globalCompositeOperation = "source-over";

  // Add subtle vignette for depth
  const vignette = ctx.createRadialGradient(
    width/2, height/2, Math.max(width, height) * 0.1,
    width/2, height/2, Math.max(width, height) * 0.8
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.15)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

export default function CanvasRenderer({
  file,
  width,
  height,
  blurPx = 60,
  sizeMultiplier = 100,
  shouldGenerate = false,
  onCanvasRef,
  onGenerated,
  onProcessingChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    onCanvasRef?.(canvasRef.current ?? null);
  }, [onCanvasRef]);

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
      console.log("Image loaded:", img.width, "x", img.height);
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
        
        console.log("Drawing image at:", drawX, drawY, drawWidth, drawHeight);
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      }
      };
    
      img.onerror = (e) => {
        console.error("Image load error:", e);
      };
    
      img.src = URL.createObjectURL(file);
  }, [file, width, height, onProcessingChange]);

  // Store the base canvas (without blur) for real-time blur updates
  const [baseCanvas, setBaseCanvas] = useState<HTMLCanvasElement | null>(null);
  const [noiseTexture, setNoiseTexture] = useState<HTMLImageElement | null>(null);

  // Load noise texture on component mount
  useEffect(() => {
    const loadNoiseTexture = () => {
      const img = new Image();
      img.onload = () => {
        setNoiseTexture(img);
      };
      img.onerror = () => {
        console.log("Noise texture not found, skipping noise overlay");
        setNoiseTexture(null);
      };
      img.src = '/noisemap.png';
    };
    
    loadNoiseTexture();
  }, []);

  // Handle generation when shouldGenerate changes
  useEffect(() => {
    if (!shouldGenerate || !currentImage || !file) {
      setIsProcessing(false);
      onProcessingChange?.(false);
      return;
    }

    console.log("Starting generation process...");
    setIsProcessing(true);
    onProcessingChange?.(true);
    
    // Add timeout to prevent infinite processing
    const timeoutId = setTimeout(() => {
      console.error("Processing timeout - taking too long");
      setIsProcessing(false);
      onProcessingChange?.(false);
    }, 10000); // 10 second timeout

    const generateAtmosphere = async () => {
        try {
          const ct = new ColorThief();
          let palette: number[][] = [];
        
          try {
          palette = ct.getPalette(currentImage, 5) as number[][];
          } catch {
            // fallback: sample approximate colors if ColorThief fails
            palette = [[30,30,30],[90,80,120],[200,180,160],[220,220,210],[120,90,70]];
          }

          // sort by brightness (darkest first)
          palette.sort((a,b) => brightness(a) - brightness(b));

          const c = canvasRef.current!;
          if (!c) {
            console.error("Canvas ref is null");
          clearTimeout(timeoutId);
          setIsProcessing(false);
          onProcessingChange?.(false);
            return;
          }
          
          c.width = width;
          c.height = height;
          const ctx = c.getContext("2d")!;
          if (!ctx) {
            console.error("Could not get 2D context");
          clearTimeout(timeoutId);
          setIsProcessing(false);
          onProcessingChange?.(false);
            return;
          }
          
          console.log("Canvas dimensions:", c.width, c.height);
          console.log("Palette extracted:", palette);
          
          // Show processing message
          ctx.fillStyle = "rgba(0,0,0,0.8)";
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = "white";
          ctx.font = "bold 24px Arial";
          ctx.fillText("🎨 Generating atmosphere...", 20, 50);
          
        // Wait a moment to show the message, then complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
            console.log("Completing generation...");
        
        // Create base canvas (without blur) for real-time updates
        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = width;
        baseCanvas.height = height;
        const baseCtx = baseCanvas.getContext('2d')!;
        
        // Generate the base image without blur
        completeGeneration(baseCanvas, palette, width, height, 0, sizeMultiplier);
        setBaseCanvas(baseCanvas);
        
        // Apply initial blur (convert percentage to pixels)
        const initialBlurPixels = (blurPx / 100) * 80;
        applyBlurToCanvas(c, baseCanvas, blurPx);
            
            // export url for preview link
            const url = c.toDataURL("image/png");
            onGenerated?.(url);
            
            console.log("Atmosphere generated successfully");
            clearTimeout(timeoutId);
            setIsProcessing(false);
        setHasGenerated(true);
            onProcessingChange?.(false);

        } catch (err) {
          console.error("Render err", err);
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
  }, [shouldGenerate, currentImage, file, width, height, sizeMultiplier, onGenerated, onProcessingChange]);

  // Apply blur to canvas in real-time
  const applyBlurToCanvas = useCallback((targetCanvas: HTMLCanvasElement, sourceCanvas: HTMLCanvasElement, blurPercent: number) => {
    const ctx = targetCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    
    if (blurPercent > 0) {
      // Convert percentage to pixels
      const blurPixels = Math.min((blurPercent / 100) * 200, 200);
      ctx.filter = `blur(${blurPixels}px)`;
    } else {
      ctx.filter = "none";
    }
    
    ctx.drawImage(sourceCanvas, 0, 0);
    ctx.filter = "none";
    
    // Apply noise texture overlay if available
    if (noiseTexture) {
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.3; // Fixed 30% opacity for subtle noise effect
      ctx.drawImage(noiseTexture, 0, 0, targetCanvas.width, targetCanvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
  }, [noiseTexture]);

  // Handle real-time blur updates with immediate response
  useEffect(() => {
    if (baseCanvas && hasGenerated) {
      const c = canvasRef.current;
      if (c) {
        // Immediate canvas update for smooth slider feedback
        applyBlurToCanvas(c, baseCanvas, blurPx);
      }
    }
  }, [blurPx, baseCanvas, hasGenerated, noiseTexture, applyBlurToCanvas]);

  // Handle real-time size updates with immediate response
  useEffect(() => {
    if (hasGenerated && currentImage) {
      const c = canvasRef.current;
      if (c) {
        // Immediate size update for smooth slider feedback
        // Regenerate the base canvas with new size
        const newBaseCanvas = document.createElement('canvas');
        newBaseCanvas.width = width;
        newBaseCanvas.height = height;
        
        // Extract colors from current image
        const colorThief = new ColorThief();
        const palette = colorThief.getPalette(currentImage, 4);
        
        // Generate new base canvas with updated size
        completeGeneration(newBaseCanvas, palette, width, height, 0, sizeMultiplier);
        setBaseCanvas(newBaseCanvas);
        
        // Apply current blur to the new base canvas
        applyBlurToCanvas(c, newBaseCanvas, blurPx);
      }
    }
  }, [sizeMultiplier, hasGenerated, currentImage, width, height, applyBlurToCanvas]);

  return (
    <div className="w-full flex justify-center items-center">
      {!file ? (
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
            ref={canvasRef} 
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