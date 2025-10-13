// Generate 4 random compatible colors for wallpaper generation
export function generateRandomColorPalette(): string[] {
  // Define color schemes that work well together
  const colorSchemes = [
    // Warm sunset
  
    // Cool ocean
    ['#667eea', '#764ba2', '#f093fb', '#f5576c'],
    // Forest green
    // Purple dream
    ['#667eea', '#764ba2', '#f093fb', '#f5576c'],
    // Autumn vibes
    ['#ff9a9e', '#fecfef', '#fecfef', '#ffecd2'],
    // Blue gradient
    ['#4facfe', '#00f2fe', '#43e97b', '#38f9d7'],
    // Pink sunset
    ['#fa709a', '#fee140', '#ffecd2', '#fcb69f'],
    // Dark theme
    ['#2c3e50', '#3498db', '#e74c3c', '#f39c12'],
    // Pastel
    // Neon
    ['#ff006e', '#8338ec', '#3a86ff', '#06ffa5'],
    // Add your custom palettes here:
    // Monochrome
    ['#2c2c2c', '#4a4a4a', '#6a6a6a', '#8a8a8a'],
    // Earth tones
    ['#8B4513', '#D2691E', '#CD853F', '#F4A460'],
    // Cool blues
    ['#191970', '#4169E1', '#87CEEB', '#B0E0E6'],
    // Warm oranges
    ['#FF4500', '#FF6347', '#FF7F50', '#FFA500'],
    // Purple gradient
    ['#4B0082', '#8A2BE2', '#9370DB', '#DDA0DD'],
    // Green nat
    
    ['#334443', '#34656D', '#FAEAB1', '#FAF8F1'],
    ['#000000', '#465C88', '#FF7A30', '#E9E3DF'],
    ['#3B3B1A', '#8A784E', '#AEC8A4', '#E7EFC7'],
  ];

  // Pick a random color scheme
  const randomScheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];
  
  // Shuffle the colors to make it more random
  return randomScheme.sort(() => Math.random() - 0.5);
}

// Convert hex to RGB for compatibility with existing code
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}
