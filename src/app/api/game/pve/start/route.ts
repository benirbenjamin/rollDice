import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbQuery, dbExecute } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Please login to play real-money games' }, { status: 401 });
    }

    const { stake } = await req.json();
    const stakeAmount = Number(stake);

    // Get system settings for min/max stake and target score
    const settingsRows = await dbQuery(`SELECT key, value FROM system_settings`);
    const settingsMap = new Map(settingsRows.map((r) => [r.key, r.value]));

    const minStake = Number(settingsMap.get('min_stake') || 500);
    const maxStake = Number(settingsMap.get('max_stake') || 100000);
    const targetScore = Number(settingsMap.get('target_score') || 100);

    if (isNaN(stakeAmount) || stakeAmount < minStake || stakeAmount > maxStake) {
      return NextResponse.json(
        { error: `Stake must be between ₦${minStake.toLocaleString()} and ₦${maxStake.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Check user balance
    const userRows = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);
    const currentBalance = Number(userRows[0]?.wallet_balance || 0);

    if (currentBalance < stakeAmount) {
      return NextResponse.json({ error: 'Insufficient wallet balance for this stake' }, { status: 400 });
    }

    // Deduct stake from wallet
    await dbExecute(`UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?`, [stakeAmount, user.id]);

    const roomId = 'pve_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Insert game room
    await dbExecute(
      `INSERT INTO game_rooms (id, player1_id, player2_id, mode, stake, target_score, p1_score, p2_score, current_turn, current_accumulated, status)
       VALUES (?, ?, 'AI_BOT', 'PVE', ?, ?, 0, 0, 0, 0, 'ACTIVE')`,
      [roomId, user.id, stakeAmount, targetScore]
    );

    // Record wager transaction
    const txId = 'tx_wager_' + Date.now();
    await dbExecute(
      `INSERT INTO transactions (id, user_id, type, amount, status, metadata)
       VALUES (?, ?, 'WAGER', ?, 'COMPLETED', ?)`,
      [txId, user.id, stakeAmount, JSON.stringify({ roomId, mode: 'PVE' })]
    );

    const updatedUser = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);

    return NextResponse.json({
      success: true,
      room: {
        id: roomId,
        mode: 'PVE',
        stake: stakeAmount,
        targetScore,
        p1Score: 0,
        p2Score: 0,
        currentTurn: 0, // 0 = Player, 1 = AI
        currentAccumulated: 0,
        status: 'ACTIVE',
        lastRoll: null,
      },
      newBalance: Number(updatedUser[0]?.wallet_balance || 0),
    });
  } catch (error: any) {
    console.error('PvE Start Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to start game' }, { status: 500 });
  }
}
