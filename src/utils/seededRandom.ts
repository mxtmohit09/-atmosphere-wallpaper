/**
 * A simple Mulberry32 seeded Pseudo-Random Number Generator.
 * Used to ensure deterministic generation of wallpapers across different resolutions.
 */

let currentSeed = 0;

/**
 * Initialize the PRNG with a specific seed value.
 */
export function setSeed(seed: number) {
    currentSeed = seed;
}

/**
 * Generate a pseudo-random number between 0 and 1.
 * Matches the signature of Math.random().
 */
export function seededRandom(): number {
    let t = currentSeed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
