// Safari-compatible blur implementation using pixel manipulation
// This works across all browsers but is used for Safari fallback

export function applySoftwareBlur(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  radius: number
): void {
  if (radius < 1) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  // Use a simple box blur algorithm - fast and effective
  const r = Math.floor(radius);
  
  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r_sum = 0, g_sum = 0, b_sum = 0, a_sum = 0, count = 0;
      
      for (let i = Math.max(0, x - r); i <= Math.min(width - 1, x + r); i++) {
        const idx = (y * width + i) * 4;
        r_sum += data[idx];
        g_sum += data[idx + 1];
        b_sum += data[idx + 2];
        a_sum += data[idx + 3];
        count++;
      }
      
      const idx = (y * width + x) * 4;
      data[idx] = Math.round(r_sum / count);
      data[idx + 1] = Math.round(g_sum / count);
      data[idx + 2] = Math.round(b_sum / count);
      data[idx + 3] = Math.round(a_sum / count);
    }
  }

  // Vertical pass
  const tempData = new Uint8ClampedArray(data);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let r_sum = 0, g_sum = 0, b_sum = 0, a_sum = 0, count = 0;
      
      for (let j = Math.max(0, y - r); j <= Math.min(height - 1, y + r); j++) {
        const idx = (j * width + x) * 4;
        r_sum += tempData[idx];
        g_sum += tempData[idx + 1];
        b_sum += tempData[idx + 2];
        a_sum += tempData[idx + 3];
        count++;
      }
      
      const idx = (y * width + x) * 4;
      data[idx] = Math.round(r_sum / count);
      data[idx + 1] = Math.round(g_sum / count);
      data[idx + 2] = Math.round(b_sum / count);
      data[idx + 3] = Math.round(a_sum / count);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

// Detect if running on Safari
export function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /safari/.test(ua) && !/chrome/.test(ua) && !/firefox/.test(ua);
}

// Check if canvas filter blur is supported
export function supportsCanvasFilter(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.filter = 'blur(1px)';
    return ctx.filter === 'blur(1px)';
  } catch {
    return false;
  }
}
