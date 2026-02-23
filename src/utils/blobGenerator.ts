import { reduceBrightness } from "./colorUtils";
import { seededRandom } from "./seededRandom";

// Improved blob generation with elongated shapes and size-based randomness
export function generateBlobs(
  ctx: CanvasRenderingContext2D,
  colors: number[][],
  blobSizes: number[],
  width: number,
  height: number,
  sizeMultiplier: number
) {
  const blobPositions = [];

  for (let i = 0; i < 5; i++) {
    // Handle the 5th blob (same color as most prominent but low opacity)
    let color, opacity;
    if (i === 4) {
      // 5th blob uses the most prominent color (first in colors) with low opacity
      color = reduceBrightness(colors[0]);
      opacity = 0.3; // Low opacity for the 5th blob
    } else if (i >= colors.length) {
      break;
    } else {
      color = reduceBrightness(colors[i]);

      // Check if this color is too bright compared to others
      const currentBrightness = color[0] + color[1] + color[2];
      const isHighBrightness = currentBrightness > 400; // Threshold for "bright" colors

      // Set opacity based on brightness and position
      if (i === 0) {
        opacity = 0.5; // Most prominent gets 50% opacity
      } else if (isHighBrightness) {
        // Bright colors get reduced opacity to avoid competition
        opacity = 0.4 + seededRandom() * 0.3; // 40-70% opacity for bright blobs
      } else {
        opacity = 1.0; // Normal colors get 100% opacity
      }
    }

    const baseBlobSize = blobSizes[i];

    // Random position around center area horizontally, but full vertical range
    const centerX = width * 0.5;
    const horizontalRange = width * 0.4; // 40% of width around center

    let x, y;
    let attempts = 0;
    const maxAttempts = 20; // Prevent infinite loop

    do {
      x = centerX + (seededRandom() - 0.5) * horizontalRange;
      y = seededRandom() * height; // Full vertical range
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

    // Random size variation based on size multiplier (±20% of base size)
    const sizeVariation = (seededRandom() - 0.5) * 0.4; // -20% to +20%
    const blobSize = baseBlobSize * (1 + sizeVariation);

    // Create elongated organic blob shape
    const drawElongatedBlob = (centerX: number, centerY: number, targetSize: number) => {
      ctx.beginPath();

      // Calculate base radius
      const baseRadius = targetSize / 2;

      // Create elongated shape with more points for smoother curves
      const numPoints = 16; // More points for smoother shapes
      const points = [];

      // Only apply elongation to the 5th blob (index 4)
      let horizontalStretch = 1;
      let verticalStretch = 1;

      if (i === 4) {
        // 5th blob gets elongation
        const elongationFactor = 1 + (sizeMultiplier - 100) / 100;
        horizontalStretch = 1 + seededRandom() * 2 * elongationFactor; // 1-3x horizontal stretch
        verticalStretch = 0.3 + seededRandom() * 0.4; // 0.3-0.7x vertical stretch
      }

      // Pre-calculate random variations for better performance
      const radiusVariations = Array.from({ length: numPoints }, () => 0.8 + seededRandom() * 0.4); // Reduced variation for smoother shapes
      const offsetsX = Array.from({ length: numPoints }, () => (seededRandom() - 0.5) * baseRadius * 0.15); // Reduced offset for smoother shapes
      const offsetsY = Array.from({ length: numPoints }, () => (seededRandom() - 0.5) * baseRadius * 0.15);

      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;

        // Use pre-calculated variations
        const pointRadius = baseRadius * radiusVariations[i];
        const offsetX = offsetsX[i];
        const offsetY = offsetsY[i];

        // Apply elongation to the basic shape
        const elongatedX = Math.cos(angle) * pointRadius * horizontalStretch;
        const elongatedY = Math.sin(angle) * pointRadius * verticalStretch;

        points.push({
          x: centerX + elongatedX + offsetX,
          y: centerY + elongatedY + offsetY
        });
      }

      // Draw the elongated organic shape using curves
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 0; i < points.length; i++) {
        const currentPoint = points[i];
        const nextPoint = points[(i + 1) % points.length];

        // Calculate control point for smooth curve
        const midX = (currentPoint.x + nextPoint.x) / 2;
        const midY = (currentPoint.y + nextPoint.y) / 2;

        // Add subtle randomness to control point for organic curves
        const controlOffset = baseRadius * (0.05 + seededRandom() * 0.15); // Reduced randomness for smoother curves
        const controlX = midX + (seededRandom() - 0.5) * controlOffset;
        const controlY = midY + (seededRandom() - 0.5) * controlOffset;

        // Draw quadratic curve to next point
        ctx.quadraticCurveTo(controlX, controlY, nextPoint.x, nextPoint.y);
      }

      ctx.closePath();
    };

    // Create elongated organic blob with calculated opacity
    // Use standard source-over for normal alpha blending
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
    drawElongatedBlob(x, y, blobSize);
    ctx.fill();
  }
}
