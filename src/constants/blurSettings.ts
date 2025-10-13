// Blur Settings - Easy to adjust values
export const BLUR_SETTINGS = {
  // Blur range mapping
  MIN_BLUR_PIXELS: 100,     // Minimum blur in pixels (at 0% slider)
  MAX_BLUR_PIXELS: 300,    // Maximum blur in pixels (at 100% slider)
  
  // Default values
  DEFAULT_BLUR_PERCENT: 50, // Default blur percentage
} as const;

// Color Settings - Easy to adjust values
export const COLOR_SETTINGS = {
  MAX_BRIGHTNESS: 600,     // Maximum brightness before reduction (0-765, where 765 = white)
} as const;

// Helper function to convert percentage to pixels
export function blurPercentToPixels(percent: number): number {
  const { MIN_BLUR_PIXELS, MAX_BLUR_PIXELS } = BLUR_SETTINGS;
  
  // Clamp the percentage to 0-100 range
  const clampedPercent = Math.max(0, Math.min(100, percent));
  
  // Calculate the pixel value (0% = MIN_BLUR_PIXELS, 100% = MAX_BLUR_PIXELS)
  const range = MAX_BLUR_PIXELS - MIN_BLUR_PIXELS;
  const normalizedPercent = clampedPercent / 100;
  
  return MIN_BLUR_PIXELS + (normalizedPercent * range);
}
