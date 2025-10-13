import { reduceBrightness } from "../utils/colorUtils";

// Geometric Fractal Generator
export function generateGeometricFractals(
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
  
  // Generate recursive triangular fractals
  const centerX = width / 2;
  const centerY = height / 2;
  const baseSize = Math.min(width, height) * 0.8 * (sizeMultiplier / 100);
  
  // Create fractal triangles
  drawFractalTriangle(ctx, centerX, centerY, baseSize, colors, 0, 4);
}

function drawFractalTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  colors: number[][],
  level: number,
  maxLevel: number
) {
  if (level >= maxLevel || size < 10) return;
  
  // Choose color based on level
  const colorIndex = level % colors.length;
  const color = reduceBrightness(colors[colorIndex]);
  
  // Calculate triangle points
  const height = size * Math.sqrt(3) / 2;
  const points = [
    { x: x, y: y - height * 2/3 },           // Top
    { x: x - size/2, y: y + height * 1/3 },  // Bottom left
    { x: x + size/2, y: y + height * 1/3 }   // Bottom right
  ];
  
  // Draw triangle
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  ctx.lineTo(points[1].x, points[1].y);
  ctx.lineTo(points[2].x, points[2].y);
  ctx.closePath();
  
  // Fill with color and opacity based on level
  const opacity = Math.max(0.1, 1 - (level * 0.2));
  ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
  ctx.fill();
  
  // Add subtle stroke
  ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity * 0.3})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Recursively draw smaller triangles
  const newSize = size * 0.5;
  const offset = size * 0.25;
  
  // Top triangle
  drawFractalTriangle(ctx, x, y - height * 1/3, newSize, colors, level + 1, maxLevel);
  
  // Bottom left triangle
  drawFractalTriangle(ctx, x - offset, y + height * 1/6, newSize, colors, level + 1, maxLevel);
  
  // Bottom right triangle
  drawFractalTriangle(ctx, x + offset, y + height * 1/6, newSize, colors, level + 1, maxLevel);
}
