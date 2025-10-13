import { reduceBrightness } from "../utils/colorUtils";

// Minimalist Gradient Generator
export function generateMinimalistGradients(
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
  
  // Generate gradient meshes
  const numGradients = Math.floor(3 + (sizeMultiplier / 100) * 5); // 3-8 gradients based on size
  
  for (let i = 0; i < numGradients; i++) {
    const color = reduceBrightness(colors[i % colors.length]);
    drawGradientMesh(ctx, color, width, height, i);
  }
}

function drawGradientMesh(
  ctx: CanvasRenderingContext2D,
  color: number[],
  width: number,
  height: number,
  index: number
) {
  // Create different gradient patterns based on index
  const patterns = [
    'radial', 'linear', 'conic', 'mesh'
  ];
  const pattern = patterns[index % patterns.length];
  
  switch (pattern) {
    case 'radial':
      drawRadialGradient(ctx, color, width, height);
      break;
    case 'linear':
      drawLinearGradient(ctx, color, width, height);
      break;
    case 'conic':
      drawConicGradient(ctx, color, width, height);
      break;
    case 'mesh':
      drawMeshGradient(ctx, color, width, height);
      break;
  }
}

function drawRadialGradient(
  ctx: CanvasRenderingContext2D,
  color: number[],
  width: number,
  height: number
) {
  const centerX = Math.random() * width;
  const centerY = Math.random() * height;
  const radius = Math.min(width, height) * (0.3 + Math.random() * 0.4);
  
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`);
  gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawLinearGradient(
  ctx: CanvasRenderingContext2D,
  color: number[],
  width: number,
  height: number
) {
  const angle = Math.random() * Math.PI * 2;
  const startX = Math.random() * width;
  const startY = Math.random() * height;
  const endX = startX + Math.cos(angle) * Math.min(width, height);
  const endY = startY + Math.sin(angle) * Math.min(width, height);
  
  const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
  gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.6)`);
  gradient.addColorStop(0.5, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.3)`);
  gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawConicGradient(
  ctx: CanvasRenderingContext2D,
  color: number[],
  width: number,
  height: number
) {
  const centerX = Math.random() * width;
  const centerY = Math.random() * height;
  const radius = Math.min(width, height) * 0.4;
  
  // Create conic gradient effect with multiple arcs
  for (let i = 0; i < 8; i++) {
    const startAngle = (i / 8) * Math.PI * 2;
    const endAngle = ((i + 1) / 8) * Math.PI * 2;
    const opacity = 0.1 + Math.random() * 0.3;
    
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
  }
}

function drawMeshGradient(
  ctx: CanvasRenderingContext2D,
  color: number[],
  width: number,
  height: number
) {
  // Create mesh-like gradient with multiple overlapping shapes
  const numShapes = 5 + Math.random() * 5;
  
  for (let i = 0; i < numShapes; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.min(width, height) * (0.1 + Math.random() * 0.3);
    const opacity = 0.1 + Math.random() * 0.2;
    
    // Create organic shape
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * (0.5 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
    
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
    ctx.fill();
  }
}
