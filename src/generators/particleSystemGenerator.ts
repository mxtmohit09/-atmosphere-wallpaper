import { reduceBrightness } from "../utils/colorUtils";

// Particle System Generator
export function generateParticleSystem(
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
  
  // Generate particles
  const numParticles = Math.floor(50 + (sizeMultiplier / 100) * 100); // 50-150 particles based on size
  
  for (let i = 0; i < numParticles; i++) {
    const color = reduceBrightness(colors[i % colors.length]);
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = (2 + Math.random() * 8) * (sizeMultiplier / 100);
    
    drawParticle(ctx, x, y, size, color);
  }
  
  // Add some connected particles for flow effect
  drawParticleConnections(ctx, colors, width, height, sizeMultiplier);
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: number[]
) {
  // Create glowing particle effect
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
  
  // Inner bright core
  gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`);
  // Outer glow
  gradient.addColorStop(0.5, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.3)`);
  // Fade to transparent
  gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, size * 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Add bright center
  ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.9)`;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticleConnections(
  ctx: CanvasRenderingContext2D,
  colors: number[][],
  width: number,
  height: number,
  sizeMultiplier: number
) {
  // Create flowing connection lines between particles
  const numConnections = Math.floor(20 + (sizeMultiplier / 100) * 30);
  
  for (let i = 0; i < numConnections; i++) {
    const color = reduceBrightness(colors[i % colors.length]);
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    const endX = startX + (Math.random() - 0.5) * width * 0.3;
    const endY = startY + (Math.random() - 0.5) * height * 0.3;
    
    // Create flowing curve
    const controlX = (startX + endX) / 2 + (Math.random() - 0.5) * width * 0.1;
    const controlY = (startY + endY) / 2 + (Math.random() - 0.5) * height * 0.1;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    
    // Gradient stroke
    const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
    gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.6)`);
    gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.1)`);
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.stroke();
  }
}
