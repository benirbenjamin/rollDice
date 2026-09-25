import crypto from 'crypto';

export interface MultiplierTier {
  multiplier: number;
  label: string;
  weight: number; // Cumulative weight scale out of 100,000
  color: string;
}

// Total Weight = 100,000
export const MULTIPLIER_TIERS: MultiplierTier[] = [
  { multiplier: 0, label: '0x (Lose)', weight: 38000, color: '#ef4444' },         // 38.0%
  { multiplier: 0.5, label: '0.5x', weight: 58000, color: '#f97316' },           // +20.0%
  { multiplier: 1.0, label: '1.0x', weight: 83000, color: '#eab308' },           // +25.0%
  { multiplier: 1.5, label: '1.5x', weight: 91500, color: '#84cc16' },           // +8.5%
  { multiplier: 2.0, label: '2.0x', weight: 96000, color: '#22c55e' },           // +4.5%
  { multiplier: 3.0, label: '3.0x', weight: 98500, color: '#06b6d4' },           // +2.5%
  { multiplier: 5.0, label: '5.0x', weight: 99500, color: '#3b82f6' },           // +1.0%
  { multiplier: 10.0, label: '10x', weight: 99850, color: '#8b5cf6' },           // +0.35%
  { multiplier: 50.0, label: '50x', weight: 99950, color: '#ec4899' },           // +0.10%
  { multiplier: 100.0, label: '100x 🔥', weight: 99980, color: '#f43f5e' },       // +0.03%
  { multiplier: 500.0, label: '500x 🚀', weight: 99995, color: '#a855f7' },       // +0.015%
  { multiplier: 1000.0, label: '1000x 👑', weight: 100000, color: '#eab308' },    // +0.005%
];

export function rollMultiplier(): { multiplier: number; tierIndex: number; label: string } {
  // Use crypto for unmanipulable randomness
  const randomBuffer = crypto.randomBytes(4);
  const randomNum = (randomBuffer.readUInt32BE(0) % 100000) + 1;

  for (let i = 0; i < MULTIPLIER_TIERS.length; i++) {
    if (randomNum <= MULTIPLIER_TIERS[i].weight) {
      return {
        multiplier: MULTIPLIER_TIERS[i].multiplier,
        tierIndex: i,
        label: MULTIPLIER_TIERS[i].label,
      };
    }
  }

  return { multiplier: 1.0, tierIndex: 2, label: '1.0x' };
}
