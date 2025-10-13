import { WallpaperStyle } from "../constants/wallpaperStyles";
import { generateBlobs } from "../utils/blobGenerator";
import { generateGeometricFractals } from "./geometricFractalGenerator";
import { generatePaintSplatters } from "./paintSplatterGenerator";
import { generateParticleSystem } from "./particleSystemGenerator";
import { generateMinimalistGradients } from "./minimalistGradientGenerator";

// Main wallpaper generator that handles all styles
export function generateWallpaper(
  style: WallpaperStyle,
  ctx: CanvasRenderingContext2D,
  colors: number[][],
  width: number,
  height: number,
  sizeMultiplier: number
) {
  switch (style) {
    case 'ATMOSPHERIC':
      generateBlobs(ctx, colors, [], width, height, sizeMultiplier);
      break;
    case 'GEOMETRIC':
      generateGeometricFractals(ctx, colors, width, height, sizeMultiplier);
      break;
    case 'PAINT':
      generatePaintSplatters(ctx, colors, width, height, sizeMultiplier);
      break;
    case 'PARTICLES':
      generateParticleSystem(ctx, colors, width, height, sizeMultiplier);
      break;
    case 'MINIMAL':
      generateMinimalistGradients(ctx, colors, width, height, sizeMultiplier);
      break;
    default:
      generateBlobs(ctx, colors, [], width, height, sizeMultiplier);
  }
}
