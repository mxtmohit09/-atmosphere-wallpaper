import { reduceBrightness } from "../utils/colorUtils";

// Paint Splatter Generator
export function generatePaintSplatters(
  ctx: CanvasRenderingContext2D,
  colors: number[][],
  width: number,
  height: number,
  sizeMultiplier: number
) {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Find the darkest color for background
  const darkestColor = colors.reduce((darkest, color) => {
    const currentBrightness = color[0] + color[1] + color[2];
    const darkestBrightness = darkest[0] + darkest[1] + darkest[2];
    return currentBrightness < darkestBrightness ? color : darkest;
  });
  
  // Fill background with darkest color
  ctx.fillStyle = `rgb(${darkestColor[0]}, ${darkestColor[1]}, ${darkestColor[2]})`;
  ctx.fillRect(0, 0, width, height);
  
  // Generate paint splatters
  const numSplatters = Math.floor(8 + (sizeMultiplier / 100) * 12); // 8-20 splatters based on size
  
  for (let i = 0; i < numSplatters; i++) {
    const color = reduceBrightness(colors[i % colors.length]);
    const x = Math.random() * width;
    const y = Math.random() * height;
    const baseSize = (20 + Math.random() * 80) * (sizeMultiplier / 100);
    
    drawPaintSplatter(ctx, x, y, baseSize, color);
  }
}

function drawPaintSplatter(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  baseSize: number,
  color: number[]
) {
  // Create multiple paint drops for realistic splatter effect
  const numDrops = 5 + Math.random() * 10; // 5-15 drops per splatter
  
  for (let i = 0; i < numDrops; i++) {
    // Random position around center with some spread
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * baseSize * 0.3;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    
    // Random size variation
    const size = baseSize * (0.3 + Math.random() * 0.7);
    
    // Create organic paint drop shape
    drawPaintDrop(ctx, x, y, size, color);
  }
}

function drawPaintDrop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: number[]
) {
  ctx.beginPath();
  
  // Create organic paint drop shape
  const width = size * (0.8 + Math.random() * 0.4);
  const height = size * (1.2 + Math.random() * 0.6); // Taller than wide
  
  // Create teardrop shape
  const topY = y - height * 0.4;
  const bottomY = y + height * 0.6;
  
  // Top rounded part
  ctx.ellipse(x, topY, width * 0.5, height * 0.3, 0, 0, Math.PI * 2);
  
  // Bottom pointed part
  ctx.moveTo(x - width * 0.5, topY);
  ctx.quadraticCurveTo(x - width * 0.2, bottomY, x, bottomY);
  ctx.quadraticCurveTo(x + width * 0.2, bottomY, x + width * 0.5, topY);
  
  // Fill with color and some transparency
  const opacity = 0.6 + Math.random() * 0.4; // 60-100% opacity
  ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
  ctx.fill();
  
  // Add subtle highlight
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.2})`;
  ctx.fill();
}
