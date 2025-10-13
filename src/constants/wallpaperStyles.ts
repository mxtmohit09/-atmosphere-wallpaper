// Wallpaper Style Options
export const WALLPAPER_STYLES = {
  ATMOSPHERIC: {
    id: 'atmospheric',
    name: 'Atmospheric Blobs',
    description: 'Organic, blurred shapes with smooth gradients',
    icon: '🌫️'
  },
  GEOMETRIC: {
    id: 'geometric',
    name: 'Geometric Fractals',
    description: 'Recursive triangular patterns with mathematical precision',
    icon: '🔺'
  },
  PAINT: {
    id: 'paint',
    name: 'Paint Splatter',
    description: 'Artistic paint drops with realistic physics',
    icon: '🎨'
  },
  PARTICLES: {
    id: 'particles',
    name: 'Particle System',
    description: 'Floating particles with subtle animation',
    icon: '✨'
  },
  MINIMAL: {
    id: 'minimal',
    name: 'Minimalist Gradients',
    description: 'Clean gradient meshes with smooth transitions',
    icon: '🎭'
  }
} as const;

export type WallpaperStyle = keyof typeof WALLPAPER_STYLES;
export const DEFAULT_STYLE: WallpaperStyle = 'ATMOSPHERIC';
