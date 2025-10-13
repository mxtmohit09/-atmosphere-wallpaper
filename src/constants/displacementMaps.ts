// Displacement Maps Configuration
export interface DisplacementMap {
  name: string;
  value: string | null;
}

export const DISPLACEMENT_MAPS: DisplacementMap[] = [
  { name: 'None', value: null },
  { name: 'Glass Effect 1', value: '/displacement-maps/glass1.png' },
  { name: 'Glass Effect 3', value: '/displacement-maps/glass2.png' },
  { name: 'Glass Effect 4', value: '/displacement-maps/glass4.png' },
  { name: 'Glass Effect 2', value: '/displacement-maps/glass21.png' },
  // Add more displacement maps here as you create them
  // { name: 'Water Ripple', value: '/displacement-maps/water-ripple.png' },
  // { name: 'Wave Pattern', value: '/displacement-maps/wave-pattern.png' },
];

export const DEFAULT_DISPLACEMENT_MAP: DisplacementMap = DISPLACEMENT_MAPS[0]; // 'None'

