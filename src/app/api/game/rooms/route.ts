import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbQuery, dbExecute } from '@/lib/db';

// GET: List active/waiting PvP rooms
export async function GET() {
  try {
    const rooms = await dbQuery(
      `SELECT r.*, u1.name as player1_name, u2.name as player2_name
       FROM game_rooms r
       LEFT JOIN users u1 ON r.player1_id = u1.id
       LEFT JOIN users u2 ON r.player2_id = u2.id
       WHERE r.mode = 'PVP' AND r.status IN ('WAITING', 'ACTIVE')
       ORDER BY r.created_at DESC LIMIT 20`
    );

    return NextResponse.json({ rooms });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new PvP multiplayer room with custom stake
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Please login to create a wager room' }, { status: 401 });
    }

    const { stake } = await req.json();
    const stakeAmount = Number(stake);

    // Get system settings for min/max stake and target score
    const settingsRows = await dbQuery(`SELECT key, value FROM system_settings`);
    const settingsMap = new Map(settingsRows.map((r) => [r.key, r.value]));

    const minStake = Number(settingsMap.get('min_stake') || 20);
    const maxStake = Number(settingsMap.get('max_stake') || 100000);
    const targetScore = Number(settingsMap.get('target_score') || 100);

    if (isNaN(stakeAmount) || stakeAmount < minStake || stakeAmount > maxStake) {
      return NextResponse.json(
        { error: `Stake must be between ₦${minStake.toLocaleString()} and ₦${maxStake.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Check balance
    const userRows = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);
    if (Number(userRows[0]?.wallet_balance || 0) < stakeAmount) {
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
    }

    // Deduct stake
    await dbExecute(`UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?`, [stakeAmount, user.id]);

    const roomId = 'room_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    await dbExecute(
      `INSERT INTO game_rooms (id, player1_id, mode, stake, target_score, p1_score, p2_score, current_turn, current_accumulated, status)
       VALUES (?, ?, 'PVP', ?, ?, 0, 0, 0, 0, 'WAITING')`,
      [roomId, user.id, stakeAmount, targetScore]
    );

    // Record wager transaction
    await dbExecute(
      `INSERT INTO transactions (id, user_id, type, amount, status, metadata)
       VALUES (?, ?, 'WAGER', ?, 'COMPLETED', ?)`,
      ['tx_pvp_' + Date.now(), user.id, stakeAmount, JSON.stringify({ roomId, mode: 'PVP' })]
    );

    const updatedUser = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);

    return NextResponse.json({
      success: true,
      roomId,
      newBalance: Number(updatedUser[0]?.wallet_balance || 0),
    });
  } catch (error: any) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: error.message || 'Failed to create room' }, { status: 500 });
  }
}
