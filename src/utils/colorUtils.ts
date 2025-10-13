import { COLOR_SETTINGS } from "../constants/blurSettings";

// Helper function to reduce brightness of overly bright colors
export function reduceBrightness(color: number[], maxBrightness: number = COLOR_SETTINGS.MAX_BRIGHTNESS): number[] {
  const [r, g, b] = color;
  const currentBrightness = r + g + b;
  
  if (currentBrightness > maxBrightness) {
    // Reduce brightness by scaling down the color values
    const scaleFactor = maxBrightness / currentBrightness;
    const reducedColor = [
      Math.round(r * scaleFactor),
      Math.round(g * scaleFactor),
      Math.round(b * scaleFactor)
    ];
    return reducedColor;
  }
  
  return color;
}
