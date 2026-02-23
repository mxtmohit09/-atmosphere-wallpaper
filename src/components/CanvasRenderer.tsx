"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import ColorThief from "colorthief";
import { blurPercentToPixels } from "../constants/blurSettings";
import { generateBlobs } from "../utils/blobGenerator";
import { isSafari, supportsCanvasFilter, applySoftwareBlur } from "../utils/safariBlur";
import { setSeed, seededRandom } from "../utils/seededRandom";

type Props = {
  file: File | null;
  width: number;
  height: number;
  fullWidth?: number; // Full resolution width for downloads
  fullHeight?: number; // Full resolution height for downloads
  mode?: 'atmospheric' | 'displacement'; // Two modes: atmospheric effect or direct displacement
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
  sizeMultiplier: number = 100,
  seed: number
) {
  setSeed(seed);
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

  // Fill blob canvas with background color to prevent blur fringes
  // Blur will sample background color instead of transparent pixels
  blobCtx.fillStyle = `rgb(${darkestColor[0]}, ${darkestColor[1]}, ${darkestColor[2]})`;
  blobCtx.fillRect(0, 0, width, height);

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

// Direct displacement mode - apply displacement directly to uploaded image
function applyDirectDisplacement(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  displacementMap: HTMLImageElement,
  intensity: number,
  width: number,
  height: number
): void {
  // Create temporary canvas for displacement
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;

  // Copy current canvas content (which already has the image, potentially with blur applied)
  tempCtx.drawImage(ctx.canvas, 0, 0);

  // Get image data from source canvas
  const sourceImageData = tempCtx.getImageData(0, 0, width, height);
  const sourceData = sourceImageData.data;

  // Create displacement map canvas
  const displacementCanvas = document.createElement('canvas');
  displacementCanvas.width = width;
  displacementCanvas.height = height;
  const displacementCtx = displacementCanvas.getContext('2d')!;

  // Enable smoothing for better displacement map scaling
  displacementCtx.imageSmoothingEnabled = true;
  displacementCtx.imageSmoothingQuality = 'high';

  // Draw displacement map scaled to canvas size
  displacementCtx.drawImage(displacementMap, 0, 0, width, height);
  const displacementImageData = displacementCtx.getImageData(0, 0, width, height);
  const displacementData = displacementImageData.data;

  // Create new image data for result
  const resultImageData = ctx.createImageData(width, height);
  const resultData = resultImageData.data;

  // Scale intensity to pixels - scaled based on image size
  const maxDisplacement = Math.min(width, height) * 0.15; // 15% of smaller dimension for subtle effect
  const pixelIntensity = (intensity / 100) * maxDisplacement;

  // Apply displacement with optimized pixel processing
  for (let y = 0; y < height; y++) {
    const yOffset = y * width;
    for (let x = 0; x < width; x++) {
      const sourceIndex = (yOffset + x) * 4;
      const displacementIndex = sourceIndex;

      // Use red and green channels for X and Y displacement
      const red = displacementData[displacementIndex];
      const green = displacementData[displacementIndex + 1];

      // Check if this is a grayscale map
      const isGrayscale = Math.abs(red - green) < 5;

      let dispX: number;
      let dispY: number;

      if (isGrayscale) {
        const normalized = (red - 128) / 128;
        dispX = normalized * pixelIntensity;
        dispY = normalized * pixelIntensity;
      } else {
        dispX = ((red - 128) / 128) * pixelIntensity;
        dispY = ((green - 128) / 128) * pixelIntensity;
      }

      // Calculate new position with intensity
      const newX = Math.max(0, Math.min(width - 1, x + dispX));
      const newY = Math.max(0, Math.min(height - 1, y + dispY));

      // Use bilinear interpolation for smoother results
      const x1 = Math.floor(newX);
      const y1 = Math.floor(newY);
      const x2 = Math.min(width - 1, x1 + 1);
      const y2 = Math.min(height - 1, y1 + 1);

      const fx = newX - x1;
      const fy = newY - y1;

      // Bilinear interpolation
      if (x1 >= 0 && x1 < width && y1 >= 0 && y1 < height && x2 >= 0 && y2 >= 0) {
        const p1 = (y1 * width + x1) * 4;
        const p2 = (y1 * width + x2) * 4;
        const p3 = (y2 * width + x1) * 4;
        const p4 = (y2 * width + x2) * 4;

        for (let c = 0; c < 3; c++) {
          const val1 = sourceData[p1 + c] * (1 - fx) + sourceData[p2 + c] * fx;
          const val2 = sourceData[p3 + c] * (1 - fx) + sourceData[p4 + c] * fx;
          resultData[sourceIndex + c] = Math.round(val1 * (1 - fy) + val2 * fy);
        }
        resultData[sourceIndex + 3] = sourceData[sourceIndex + 3];
      } else {
        resultData[sourceIndex] = sourceData[sourceIndex];
        resultData[sourceIndex + 1] = sourceData[sourceIndex + 1];
        resultData[sourceIndex + 2] = sourceData[sourceIndex + 2];
        resultData[sourceIndex + 3] = sourceData[sourceIndex + 3];
      }
    }
  }

  // Draw result back to canvas
  ctx.putImageData(resultImageData, 0, 0);
}

// Apply displacement map effect - optimized version
function applyDisplacementMap(
  ctx: CanvasRenderingContext2D,
  displacementMap: HTMLImageElement,
  intensity: number,
  width: number,
  height: number
): void {
  // Create temporary canvas for displacement
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;

  // Copy current canvas content
  tempCtx.drawImage(ctx.canvas, 0, 0);

  // Get image data from source canvas
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

  // Scale intensity to pixels (intensity is percentage, scale to max pixel range)
  // Doubled sensitivity: 2x more intense displacement
  const pixelIntensity = (intensity / 100) * 200; // Max 200 pixels displacement for 2x more intense effect

  // Apply displacement with optimized pixel processing
  for (let y = 0; y < height; y++) {
    const yOffset = y * width;
    for (let x = 0; x < width; x++) {
      const sourceIndex = (yOffset + x) * 4;
      const displacementIndex = sourceIndex;

      // Get displacement values (grayscale, so use red and green channels)
      const displacementX = (displacementData[displacementIndex] - 128) / 128; // -1 to 1
      const displacementY = (displacementData[displacementIndex + 1] - 128) / 128; // -1 to 1

      // Calculate new position with intensity
      const newX = Math.max(0, Math.min(width - 1, x + displacementX * pixelIntensity));
      const newY = Math.max(0, Math.min(height - 1, y + displacementY * pixelIntensity));

      // Use bilinear interpolation for smoother results (reduces fringes)
      const x1 = Math.floor(newX);
      const y1 = Math.floor(newY);
      const x2 = Math.min(width - 1, x1 + 1);
      const y2 = Math.min(height - 1, y1 + 1);

      const fx = newX - x1;
      const fy = newY - y1;

      // Check bounds and sample with bilinear interpolation
      if (x1 >= 0 && x1 < width && y1 >= 0 && y1 < height && x2 >= 0 && y2 >= 0) {
        // Get the four surrounding pixels for bilinear interpolation
        const p1 = (y1 * width + x1) * 4;
        const p2 = (y1 * width + x2) * 4;
        const p3 = (y2 * width + x1) * 4;
        const p4 = (y2 * width + x2) * 4;

        // Bilinear interpolation for each color channel (smoother, reduces fringes)
        for (let c = 0; c < 3; c++) {
          const val1 = sourceData[p1 + c] * (1 - fx) + sourceData[p2 + c] * fx;
          const val2 = sourceData[p3 + c] * (1 - fx) + sourceData[p4 + c] * fx;
          resultData[sourceIndex + c] = Math.round(val1 * (1 - fy) + val2 * fy);
        }
        // Keep alpha channel
        resultData[sourceIndex + 3] = sourceData[sourceIndex + 3];
      } else {
        // Out of bounds - keep original pixel
        resultData[sourceIndex] = sourceData[sourceIndex];
        resultData[sourceIndex + 1] = sourceData[sourceIndex + 1];
        resultData[sourceIndex + 2] = sourceData[sourceIndex + 2];
        resultData[sourceIndex + 3] = sourceData[sourceIndex + 3];
      }
    }
  }

  // Draw result back to canvas
  ctx.putImageData(resultImageData, 0, 0);
}

export default function CanvasRenderer({
  file,
  width,
  height,
  fullWidth,
  fullHeight,
  mode = 'atmospheric',
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
  const seedRef = useRef<number>(Math.floor(Math.random() * 1000000));

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

  // Handle mode changes - clear generated data and redraw original image when switching modes
  useEffect(() => {
    if (mode === 'displacement') {
      // Clear atmospheric generation data when switching to glass effect
      setBackgroundCanvas(null);
      setBlobCanvas(null);
    }
    setHasGenerated(false);

    // Redraw original image if available to remove any lingering effects
    if (currentImage) {
      const c = canvasRef.current;
      if (c) {
        c.width = width;
        c.height = height;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, c.width, c.height);

          // Calculate scaling to fit image in canvas while maintaining aspect ratio
          const imgAspect = currentImage.width / currentImage.height;
          const canvasAspect = c.width / c.height;

          let drawWidth, drawHeight, drawX, drawY;

          if (imgAspect > canvasAspect) {
            drawWidth = c.width;
            drawHeight = c.width / imgAspect;
            drawX = 0;
            drawY = (c.height - drawHeight) / 2;
          } else {
            drawHeight = c.height;
            drawWidth = c.height * imgAspect;
            drawX = (c.width - drawWidth) / 2;
            drawY = 0;
          }

          ctx.drawImage(currentImage, drawX, drawY, drawWidth, drawHeight);
        }
      }
    } else {
      // If no image but canvas exists, clear it
      const c = canvasRef.current;
      if (c && !isRandomMode && !isCustomMode) {
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, c.width, c.height);
        }
      }
    }
  }, [mode, currentImage, width, height, isRandomMode, isCustomMode]);

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

    // For displacement mode with file, we need the file
    if (mode === 'displacement' && file) {
      // Proceed with displacement generation
    } else if (mode === 'atmospheric') {
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
    } else {
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

    // Generate a new random seed for this explicit generation
    seedRef.current = Math.floor(Math.random() * 1000000);

    const generateContent = async () => {
      try {
        const c = canvasRef.current;
        if (!c) {
          clearTimeout(timeoutId);
          setIsProcessing(false);
          onProcessingChange?.(false);
          return;
        }

        c.width = width;
        c.height = height;
        const ctx = c.getContext("2d")!;
        if (!ctx) {
          clearTimeout(timeoutId);
          setIsProcessing(false);
          onProcessingChange?.(false);
          return;
        }

        // Handle displacement mode - direct image displacement
        if (mode === 'displacement') {
          // Wait for image to load if not ready yet
          if (!currentImage) {
            // Show loading message
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = "white";
            ctx.font = "bold 20px Arial";
            ctx.fillText("Loading image...", 20, 50);

            // Wait for image to load
            await new Promise(resolve => setTimeout(resolve, 500));

            // Try again
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
          ctx.fillText("🎨 Applying glass effect...", 20, 50);

          // Wait a moment to show the message
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Ensure context is totally clean before drawing
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1.0;
          ctx.filter = "none";

          // Draw the image
          ctx.drawImage(currentImage, 0, 0, width, height);

          // Apply blur if specified (for glass effect mode)
          if (blurPx && blurPx > 0 && supportsCanvasFilter() && !isSafari()) {
            const blurPixels = blurPercentToPixels(blurPx);
            ctx.filter = `blur(${blurPixels}px)`;
            ctx.drawImage(currentImage, 0, 0, width, height);
            ctx.filter = "none";
          } else if (blurPx && blurPx > 0) {
            // Software blur for Safari
            applySoftwareBlur(ctx, ctx.canvas, blurPercentToPixels(blurPx));
          }

          // Apply displacement if enabled
          if (displacementEnabled && displacementMapImage) {
            applyDirectDisplacement(ctx, currentImage, displacementMapImage, displacementIntensity, width, height);
          }

          // Synchronize final state updates to avoid React double-render tearing
          setIsProcessing(false);
          setHasGenerated(true);
          onProcessingChange?.(false);

          // Capture all rendering state at generation time so the download is pixel-perfect
          // Lock blur, displacement, and image values in the closure right now
          const lockedBlurPx = blurPx;
          const lockedDisplacementEnabled = displacementEnabled;
          const lockedDisplacementIntensity = displacementIntensity;
          const lockedDisplacementMap = displacementMapImage;
          const lockedImage = currentImage;

          // Set up download function
          if (onDownloadCanvasReady) {
            // Preview is already full resolution — just copy the canvas directly
            const downloadFunction = (_blurPercent: number) => {
              const downloadCanvas = document.createElement('canvas');
              downloadCanvas.width = c.width;
              downloadCanvas.height = c.height;
              const dCtx = downloadCanvas.getContext("2d")!;
              dCtx.imageSmoothingEnabled = true;
              dCtx.imageSmoothingQuality = "high";
              dCtx.drawImage(c, 0, 0);
              return downloadCanvas;
            };
            onDownloadCanvasReady(downloadFunction);
          }

          // Trigger the page to know generation is finished
          // export url for preview link - use PNG for full quality
          const url = c.toDataURL("image/png");
          onGenerated?.(url);

          clearTimeout(timeoutId);
          return;
        }

        // Atmospheric mode - generate blobs
        let palette: number[][] = [];

        if (isRandomMode && randomColors.length > 0) {
          palette = randomColors.map(color => hexToRgbOptimized(color));
        } else if (isCustomMode && customColorsRef.current.length > 0) {
          palette = customColorsRef.current.map(color => hexToRgbOptimized(color));
        } else if (currentImage) {
          const ct = new ColorThief();
          try {
            palette = ct.getPalette(currentImage, 5) as number[][];
          } catch {
            palette = [[30, 30, 30], [90, 80, 120], [200, 180, 160], [220, 220, 210], [120, 90, 70]];
          }
        } else {
          palette = [[30, 30, 30], [90, 80, 120], [200, 180, 160], [220, 220, 210], [120, 90, 70]];
        }

        palette.sort((a, b) => brightness(a) - brightness(b));

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

        // Generate the atmospheric wallpaper using the locked seed
        createLayeredGeneration(bgCanvas, blobCanvas, palette, width, height, sizeMultiplier, seedRef.current);
        setBackgroundCanvas(bgCanvas);
        setBlobCanvas(blobCanvas);
        applyBlurToCanvas(c, bgCanvas, blobCanvas, blurPx);

        // Set up download function immediately after generation is complete
        if (onDownloadCanvasReady) {
          // Preview is already full resolution — just copy the canvas directly
          const downloadFunction = (_blurPercent: number) => {
            const downloadCanvas = document.createElement('canvas');
            downloadCanvas.width = c.width;
            downloadCanvas.height = c.height;
            const ctx = downloadCanvas.getContext("2d")!;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(c, 0, 0);
            return downloadCanvas;
          };
          onDownloadCanvasReady(downloadFunction);
        }


        // Synchronize final state updates to avoid React double-render tearing
        setIsProcessing(false);
        setHasGenerated(true);
        onProcessingChange?.(false);

        // Trigger the page to know generation is finished
        // export url for preview link - use PNG for full quality
        const url = c.toDataURL("image/png");
        onGenerated?.(url);

        clearTimeout(timeoutId);

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

    generateContent();

    // cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
    };
  }, [shouldGenerate, currentImage, file, width, height, sizeMultiplier, onGenerated, isRandomMode, randomColors, isCustomMode, canvasReady, mode, displacementEnabled, displacementMapImage, displacementIntensity]);

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
    // Blob canvas has background color filled, so blur samples background instead of transparent
    const blurPixels = blurPercentToPixels(blurPercent);

    // Use lighten blend mode to only show pixels lighter than background
    // Lighten: result = max(source, dest) - eliminates background color at edges
    ctx.globalCompositeOperation = "lighten";

    // Check if canvas filter is supported (Safari fallback)
    if (supportsCanvasFilter() && !isSafari()) {
      // Use native canvas filter for Chrome/Firefox
      ctx.filter = `blur(${blurPixels}px)`;
      ctx.drawImage(blobCanvas, 0, 0);
      ctx.filter = "none";
    } else {
      // Use software blur for Safari and unsupported browsers
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = targetCanvas.width;
      tempCanvas.height = targetCanvas.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.drawImage(blobCanvas, 0, 0);

      if (blurPixels > 0) {
        applySoftwareBlur(tempCtx, tempCanvas, blurPixels);
      }

      ctx.drawImage(tempCanvas, 0, 0);
    }

    ctx.globalCompositeOperation = "source-over";

    // Add background color layer to fill vignette edges caused by blur
    // Use darken blend mode to only fill dark areas (vignette) without affecting lighter blob colors
    ctx.globalCompositeOperation = "darken";
    ctx.globalAlpha = 0.3; // 30% opacity - subtle fill to eliminate vignette
    ctx.drawImage(backgroundCanvas, 0, 0);

    // Reset context state
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1.0;
    ctx.filter = "none";

    // Apply noise texture overlay if available (preview version - lighter)
    if (noiseTexture) {
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.6; // 60% opacity for preview
      ctx.drawImage(noiseTexture, 0, 0, targetCanvas.width, targetCanvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
  }, [noiseTexture]);

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

    // Apply additional noise texture overlay for download (on top of existing noise)
    if (noiseTexture) {
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.25; // Additional 40% noise on top of existing 30% = 70% total
      ctx.drawImage(noiseTexture, 0, 0, downloadCanvas.width, downloadCanvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }

    return downloadCanvas;
  }, [noiseTexture]);

  // Handle real-time blur updates with immediate response
  useEffect(() => {
    if (mode === 'atmospheric' && backgroundCanvas && blobCanvas && hasGenerated && !isProcessing) {
      const c = canvasRef.current;
      if (c) {
        // Immediate canvas update for smooth slider feedback
        applyBlurToCanvas(c, backgroundCanvas, blobCanvas, blurPx);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blurPx, backgroundCanvas, blobCanvas, hasGenerated, mode, isProcessing]);

  // Handle real-time size updates with immediate response
  useEffect(() => {
    if (mode === 'atmospheric' && hasGenerated && !isProcessing && (currentImage || isRandomMode || isCustomMode)) {
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
          palette = [[30, 30, 30], [90, 80, 120], [200, 180, 160], [220, 220, 210]];
        }

        // Generate new layered canvases with a fresh random seed for each size change
        // This produces fresh random blob positions when the slider moves, matching original behavior
        const newSeed = Math.floor(Math.random() * 1000000);
        seedRef.current = newSeed;
        createLayeredGeneration(newBgCanvas, newBlobCanvas, palette, width, height, sizeMultiplier, newSeed);
        setBackgroundCanvas(newBgCanvas);
        setBlobCanvas(newBlobCanvas);


        // Apply current blur to the new layered canvases
        applyBlurToCanvas(c, newBgCanvas, newBlobCanvas, blurPx);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizeMultiplier, hasGenerated, currentImage, width, height, isRandomMode, randomColors, isCustomMode, mode, isProcessing]);

  // Handle real-time blur and displacement updates in glass effect mode
  useEffect(() => {
    if (mode === 'displacement' && hasGenerated && currentImage && !isProcessing) {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d")!;

        // Step 1: Clear canvas
        ctx.clearRect(0, 0, c.width, c.height);

        // Step 2: Apply blur if specified
        if (blurPx != null && blurPx > 0) {
          const blurPixels = blurPercentToPixels(blurPx);
          if (supportsCanvasFilter() && !isSafari()) {
            // Use canvas filter for blur - draw with filter applied
            ctx.filter = `blur(${blurPixels}px)`;
            ctx.drawImage(currentImage, 0, 0, c.width, c.height);
            ctx.filter = "none";
          } else {
            // Use software blur for Safari/unsupported browsers
            ctx.drawImage(currentImage, 0, 0, c.width, c.height);
            applySoftwareBlur(ctx, c, blurPixels);
          }
        } else {
          // No blur - just draw the image
          ctx.drawImage(currentImage, 0, 0, c.width, c.height);
        }

        // Step 3: Apply displacement on top of the (optionally blurred) image
        if (displacementEnabled && displacementMapImage && displacementIntensity > 0) {
          applyDirectDisplacement(ctx, currentImage, displacementMapImage, displacementIntensity, c.width, c.height);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blurPx, displacementIntensity, mode, hasGenerated, currentImage, displacementEnabled, displacementMapImage, isProcessing]);

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
        <div className="w-full h-full flex items-center justify-center">
          <canvas
            ref={setCanvasRef}
            className="rounded-lg"
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              maxWidth: "100%",
              objectFit: "contain"
            }}
          />
          {!shouldGenerate && !isProcessing && currentImage && !hasGenerated && (
            <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-sm text-white font-medium">Ready to Generate</p>
                <p className="text-xs text-gray-300">Click "Generate"</p>
              </div>
            </div>
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
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
