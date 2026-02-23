// Glassify Image Utility
// Applies blur and glass displacement effect directly to uploaded images

function blurPercentToPixels(blurPercent: number): number {
  // Convert blur percentage (0-100) to pixels
  // Max blur is approximately 100px for 100%
  return (blurPercent / 100) * 100;
}

// Apply displacement map effect - optimized for glass aesthetic
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
  
  // Scale intensity to pixels - more subtle for glass effect
  // Use a smaller base intensity for more aesthetic results
  // Max displacement is scaled based on image size for better results
  // For glass effects, we want subtle refraction, not extreme distortion
  const maxDisplacement = Math.min(width, height) * 0.08; // 8% of smaller dimension for subtle effect
  const pixelIntensity = (intensity / 100) * maxDisplacement;
  
  // Apply displacement with optimized pixel processing
  for (let y = 0; y < height; y++) {
    const yOffset = y * width;
    for (let x = 0; x < width; x++) {
      const sourceIndex = (yOffset + x) * 4;
      const displacementIndex = sourceIndex;
      
      // Use red and green channels for X and Y displacement (standard displacement map format)
      // Red channel controls horizontal displacement, green controls vertical
      const red = displacementData[displacementIndex];
      const green = displacementData[displacementIndex + 1];
      
      // Check if this is a grayscale map (red and green are very similar)
      // For grayscale maps, use the same value for both X and Y for uniform glass effect
      const isGrayscale = Math.abs(red - green) < 5;
      
      let dispX: number;
      let dispY: number;
      
      if (isGrayscale) {
        // For grayscale maps, use the same normalized value for both axes
        // This creates a uniform, aesthetic glass refraction effect
        const normalized = (red - 128) / 128;
        dispX = normalized * pixelIntensity;
        dispY = normalized * pixelIntensity;
      } else {
        // For proper RGB displacement maps, use red/green channels separately
        // This allows for directional displacement patterns
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
      
      // Check bounds and sample with bilinear interpolation
      if (x1 >= 0 && x1 < width && y1 >= 0 && y1 < height && x2 >= 0 && y2 >= 0) {
        // Get the four surrounding pixels for bilinear interpolation
        const p1 = (y1 * width + x1) * 4;
        const p2 = (y1 * width + x2) * 4;
        const p3 = (y2 * width + x1) * 4;
        const p4 = (y2 * width + x2) * 4;
        
        // Bilinear interpolation for each color channel
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

export interface GlassifyOptions {
  blurPercent?: number;
  displacementMapPath?: string | null;
  displacementIntensity?: number;
  useImageDimensions?: boolean; // If true, use image's natural dimensions instead of provided width/height
  width?: number;
  height?: number;
}

export interface GlassifyResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/**
 * Glassify an image by applying blur and glass displacement effect
 * @param imageFile - The image file to process
 * @param options - Processing options
 * @returns Promise that resolves to a result object with canvas and dimensions
 */
export async function glassifyImage(
  imageFile: File,
  options: GlassifyOptions
): Promise<GlassifyResult> {
  const {
    blurPercent = 50,
    displacementMapPath = '/displacement-maps/glass1.png',
    displacementIntensity = 50,
    useImageDimensions = false,
    width,
    height,
  } = options;

  return new Promise((resolve, reject) => {
    // Load the image
    const img = new Image();
    img.onload = async () => {
      try {
        // Determine canvas dimensions
        let canvasWidth: number;
        let canvasHeight: number;
        
        if (useImageDimensions) {
          // Use the image's natural dimensions
          canvasWidth = img.width;
          canvasHeight = img.height;
        } else if (width && height) {
          // Use provided dimensions
          canvasWidth = width;
          canvasHeight = height;
        } else {
          // Fallback to image dimensions if no dimensions provided
          canvasWidth = img.width;
          canvasHeight = img.height;
        }
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d')!;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the image to canvas
        if (useImageDimensions || !width || !height) {
          // Draw image at full size
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        } else {
          // Calculate scaling to fit image in canvas while maintaining aspect ratio
          const imgAspect = img.width / img.height;
          const canvasAspect = canvasWidth / canvasHeight;
          
          let drawWidth, drawHeight, drawX, drawY;
          
          if (imgAspect > canvasAspect) {
            // Image is wider than canvas
            drawWidth = canvasWidth;
            drawHeight = canvasWidth / imgAspect;
            drawX = 0;
            drawY = (canvasHeight - drawHeight) / 2;
          } else {
            // Image is taller than canvas
            drawHeight = canvasHeight;
            drawWidth = canvasHeight * imgAspect;
            drawX = (canvasWidth - drawWidth) / 2;
            drawY = 0;
          }
          
          // Draw the image to canvas
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        }
        
        // Apply blur
        const blurPixels = blurPercentToPixels(blurPercent);
        if (blurPixels > 0) {
          const padding = Math.ceil(blurPixels * 1.5);
          
          if (padding > 20) {
            // Create padded canvas for blur
            const paddedCanvas = document.createElement('canvas');
            paddedCanvas.width = canvasWidth + padding * 2;
            paddedCanvas.height = canvasHeight + padding * 2;
            const paddedCtx = paddedCanvas.getContext('2d')!;
            paddedCtx.imageSmoothingEnabled = true;
            paddedCtx.imageSmoothingQuality = 'high';
            
            // Fill with black background
            paddedCtx.fillStyle = '#000000';
            paddedCtx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
            
            // Draw image in center
            paddedCtx.drawImage(canvas, padding, padding);
            
            // Apply blur
            const blurredCanvas = document.createElement('canvas');
            blurredCanvas.width = paddedCanvas.width;
            blurredCanvas.height = paddedCanvas.height;
            const blurredCtx = blurredCanvas.getContext('2d')!;
            blurredCtx.imageSmoothingEnabled = true;
            blurredCtx.imageSmoothingQuality = 'high';
            
            blurredCtx.filter = `blur(${blurPixels}px)`;
            blurredCtx.drawImage(paddedCanvas, 0, 0);
            blurredCtx.filter = 'none';
            
            // Draw back to main canvas
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.drawImage(blurredCanvas, padding, padding, canvasWidth, canvasHeight, 0, 0, canvasWidth, canvasHeight);
          } else {
            // Small blur, apply directly
            ctx.filter = `blur(${blurPixels}px)`;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvasWidth;
            tempCanvas.height = canvasHeight;
            const tempCtx = tempCanvas.getContext('2d')!;
            tempCtx.drawImage(canvas, 0, 0);
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.filter = 'none';
          }
        }
        
        // Apply displacement map if provided
        if (displacementMapPath) {
          try {
            const displacementMap = new Image();
            displacementMap.crossOrigin = 'anonymous';
            
            await new Promise<void>((resolveMap, rejectMap) => {
              displacementMap.onload = () => resolveMap();
              displacementMap.onerror = () => rejectMap(new Error('Failed to load displacement map'));
              displacementMap.src = displacementMapPath;
            });
            
            applyDisplacementMap(ctx, displacementMap, displacementIntensity, canvasWidth, canvasHeight);
          } catch (error) {
            console.warn('Failed to apply displacement map, continuing without it:', error);
            // Continue without displacement map if it fails to load
          }
        }
        
        resolve({
          canvas,
          width: canvasWidth,
          height: canvasHeight,
        });
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(imageFile);
  });
}

