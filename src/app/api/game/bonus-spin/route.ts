import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbQuery, dbExecute } from '@/lib/db';
import { rollMultiplier } from '@/lib/multiplierEngine';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId } = await req.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
    }

    // Find completed room where user is winner and status is COMPLETED (not claimed yet)
    const rooms = await dbQuery(
      `SELECT * FROM game_rooms WHERE id = ? AND winner_id = ? AND status = 'COMPLETED'`,
      [roomId, user.id]
    );

    if (rooms.length === 0) {
      return NextResponse.json({ error: 'No unclaimed winning game room found' }, { status: 400 });
    }

    const room = rooms[0];

    // Fetch base payout previously awarded or base calculation
    const houseRakeRows = await dbQuery(`SELECT value FROM system_settings WHERE key = 'house_rake_percent'`);
    const houseRakePercent = Number(houseRakeRows[0]?.value || 10);
    const stake = Number(room.stake);
    const totalPot = stake * 2;
    const basePayout = totalPot - (totalPot * houseRakePercent) / 100;

    // Roll multiplier securely
    const outcome = rollMultiplier();
    const multiplier = outcome.multiplier;
    const tierIndex = outcome.tierIndex;

    // Calculate dynamic final payout
    const rawPayout = basePayout * multiplier;
    
    // House safety cap: Max 10,000 RWF per single spin to avoid draining liquidity
    const MAX_SINGLE_PAYOUT = 10000;
    const finalPayout = Math.min(rawPayout, MAX_SINGLE_PAYOUT);

    // Difference between base payout originally credited vs new spin payout
    // If multiplier < 1 (e.g. 0x or 0.5x), deduct difference from wallet
    // If multiplier > 1 (e.g. 2x, 10x, 1000x), add extra difference to wallet
    const payoutDifference = finalPayout - basePayout;

    // Update room status to BONUS_SPIN_CLAIMED to prevent duplicate spins
    await dbExecute(
      `UPDATE game_rooms SET status = 'BONUS_SPIN_CLAIMED' WHERE id = ?`,
      [roomId]
    );

    // Adjust user wallet balance
    if (payoutDifference !== 0) {
      await dbExecute(`UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?`, [payoutDifference, user.id]);
    }

    // Record Bonus Spin transaction
    await dbExecute(
      `INSERT INTO transactions (id, user_id, type, amount, status, metadata)
       VALUES (?, ?, 'BONUS_SPIN', ?, 'COMPLETED', ?)`,
      [
        'tx_spin_' + Date.now(),
        user.id,
        finalPayout,
        JSON.stringify({ roomId, multiplier, basePayout, finalPayout, payoutDifference }),
      ]
    );

    const updatedUser = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);

    return NextResponse.json({
      success: true,
      multiplier,
      tierIndex,
      label: outcome.label,
      basePayout,
      finalPayout,
      payoutDifference,
      newBalance: Number(updatedUser[0]?.wallet_balance || 0),
    });
  } catch (error: any) {
    console.error('Bonus spin error:', error);
    return NextResponse.json({ error: error.message || 'Spin execution failed' }, { status: 500 });
  }
}
