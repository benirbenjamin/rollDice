import crypto from 'crypto';
import { dbQuery, dbExecute } from './db';

export interface NewPlayerQualification {
  isBoosted: boolean;
  reason: string;
  depositCount: number;
  accountAgeHours: number;
  isFreshDevice: boolean;
}

/**
 * Generate a device/browser fingerprint hash based on request headers.
 */
export function getDeviceFingerprint(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'unknown-browser';
  const clientFp = req.headers.get('x-device-fingerprint') || '';

  const rawString = `${ip}-${userAgent}-${clientFp}`;
  return crypto.createHash('sha256').update(rawString).digest('hex').substring(0, 32);
}

/**
 * Checks whether a user qualifies for the New Player Engagement Boost.
 * 
 * Qualification Rules:
 * 1. Account age is on 1st/2nd day (<= 48 hours old) OR deposit count <= 3.
 * 2. Device Fingerprint Anti-Exploit Check:
 *    If the current device/browser fingerprint was ALREADY used by another account created > 48h ago,
 *    the device is treated as REUSED / DUPLICATE, and the boost is DISABLED.
 */
export async function checkNewPlayerQualification(
  userId: string,
  req?: Request
): Promise<NewPlayerQualification> {
  try {
    const userRows = await dbQuery(
      `SELECT id, created_at, device_fingerprint FROM users WHERE id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return { isBoosted: false, reason: 'User not found', depositCount: 0, accountAgeHours: 999, isFreshDevice: false };
    }

    const user = userRows[0];
    const createdAtTime = new Date(user.created_at).getTime();
    const now = Date.now();
    const accountAgeHours = (now - createdAtTime) / (1000 * 60 * 60);

    // Get current request device fingerprint
    let currentFp = user.device_fingerprint || '';
    if (req) {
      currentFp = getDeviceFingerprint(req);
      if (!user.device_fingerprint || user.device_fingerprint !== currentFp) {
        // Associate fingerprint with user account
        await dbExecute(`UPDATE users SET device_fingerprint = ? WHERE id = ?`, [currentFp, userId]);
      }
    }

    // Check Completed Deposit Count
    const depRows = await dbQuery(
      `SELECT COUNT(*) as dep_count FROM transactions WHERE user_id = ? AND type = 'DEPOSIT' AND status = 'COMPLETED'`,
      [userId]
    );
    const depositCount = Number(depRows[0]?.dep_count || 0);

    // Multi-Account / Device Anti-Exploit Check:
    // Check if this same device_fingerprint was ALREADY used by an older account (> 48 hours old)
    let isFreshDevice = true;
    if (currentFp) {
      const olderAccounts = await dbQuery(
        `SELECT id, created_at FROM users WHERE device_fingerprint = ? AND id != ? ORDER BY created_at ASC LIMIT 1`,
        [currentFp, userId]
      );

      if (olderAccounts.length > 0) {
        const olderCreatedAt = new Date(olderAccounts[0].created_at).getTime();
        const olderAgeHours = (now - olderCreatedAt) / (1000 * 60 * 60);
        // If device was used by an account older than 24 hours, treat device as NOT NEW
        if (olderAgeHours > 24) {
          isFreshDevice = false;
        }
      }
    }

    if (!isFreshDevice) {
      return {
        isBoosted: false,
        reason: 'Device previously associated with existing account',
        depositCount,
        accountAgeHours,
        isFreshDevice: false,
      };
    }

    // Account is boosted if:
    // 1. Device is fresh AND
    // 2. Account is within 1st/2nd day (<= 48h) OR 1st to 3rd deposit (depositCount <= 3)
    const isWithinTargetPeriod = accountAgeHours <= 48 || depositCount <= 3;
    const isBoosted = isFreshDevice && isWithinTargetPeriod;

    return {
      isBoosted,
      reason: isBoosted ? 'Qualified New Player' : 'Target period expired',
      depositCount,
      accountAgeHours,
      isFreshDevice,
    };
  } catch (error) {
    console.error('New Player Qualification check error:', error);
    return { isBoosted: false, reason: 'Check error', depositCount: 0, accountAgeHours: 999, isFreshDevice: false };
  }
}

/**
 * Rolls a guaranteed multiplier between 2.0x and 5.0x for qualified new players.
 * Capped at 5.0x maximum to ensure platform profitability.
 */
export function rollBoostedMultiplier(): { multiplier: number; tierIndex: number; label: string } {
  // Boosted options:
  // 2.0x (weight 50%) -> tierIndex 4 ('2.0x 🚀')
  // 3.0x (weight 35%) -> tierIndex 5 ('3.0x 🌟')
  // 5.0x (weight 15%) -> tierIndex 6 ('5.0x 💎')
  const rand = Math.random() * 100;

  if (rand < 50) {
    return { multiplier: 2.0, tierIndex: 4, label: '2.0x 🚀' };
  } else if (rand < 85) {
    return { multiplier: 3.0, tierIndex: 5, label: '3.0x 🌟' };
  } else {
    return { multiplier: 5.0, tierIndex: 6, label: '5.0x 💎' };
  }
}

/**
 * Calculates the dynamic MAX_SINGLE_PAYOUT ceiling for bonus spins based on total house income.
 * 
 * Rules:
 * 1. Total house income = max(total rake collected from games, house_balance setting).
 * 2. If total house income >= 10,000 FRW:
 *    maxSinglePayout = Math.max(10000, totalHouseIncome * 0.20)
 *    (i.e. From 10,000 FRW up to 20% of total overall house income).
 * 3. If total house income < 10,000 FRW:
 *    maxSinglePayout = Configured Admin Fallback setting (`min_payout_low_house`), defaulting to 2,000 FRW.
 */
export async function calculateMaxSinglePayout(): Promise<{
  maxSinglePayout: number;
  totalHouseIncome: number;
  isLowHouseBalance: boolean;
  configuredLowHousePayout: number;
}> {
  try {
    const houseRakeRows = await dbQuery(
      `SELECT SUM(rake_amount) as total_rake FROM game_rooms WHERE status = 'COMPLETED' OR status = 'BONUS_SPIN_CLAIMED'`
    );
    const houseSettingRows = await dbQuery(
      `SELECT key, value FROM system_settings WHERE key IN ('house_balance', 'min_payout_low_house')`
    );

    const settingsMap = new Map(houseSettingRows.map((s) => [s.key, s.value]));
    const totalRakeCollected = Number(houseRakeRows[0]?.total_rake || 0);
    const houseBalanceSetting = Number(settingsMap.get('house_balance') || 0);
    const configuredLowHousePayout = Number(settingsMap.get('min_payout_low_house') || 2000);

    const totalHouseIncome = Math.max(totalRakeCollected, houseBalanceSetting);

    let maxSinglePayout = 10000;
    let isLowHouseBalance = false;

    if (totalHouseIncome >= 10000) {
      maxSinglePayout = Math.max(10000, totalHouseIncome * 0.20);
    } else {
      isLowHouseBalance = true;
      maxSinglePayout = configuredLowHousePayout;
    }

    return {
      maxSinglePayout: Math.round(maxSinglePayout),
      totalHouseIncome: Math.round(totalHouseIncome),
      isLowHouseBalance,
      configuredLowHousePayout,
    };
  } catch (error) {
    console.error('Error calculating dynamic max single payout:', error);
    return {
      maxSinglePayout: 10000,
      totalHouseIncome: 0,
      isLowHouseBalance: true,
      configuredLowHousePayout: 2000,
    };
  }
}
