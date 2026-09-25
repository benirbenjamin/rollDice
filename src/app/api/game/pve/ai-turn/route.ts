import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbQuery, dbExecute } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId } = await req.json();

    const rooms = await dbQuery(`SELECT * FROM game_rooms WHERE id = ? AND player1_id = ? AND status = 'ACTIVE'`, [
      roomId,
      user.id,
    ]);

    if (rooms.length === 0) {
      return NextResponse.json({ error: 'Active game room not found' }, { status: 404 });
    }

    const room = rooms[0];

    // Verify it is indeed AI's turn
    if (room.current_turn !== 1) {
      return NextResponse.json({
        success: true,
        message: 'Not AI turn',
        currentTurn: room.current_turn,
        p1Score: room.p1_score,
        p2Score: room.p2_score,
      });
    }

    let aiScore = Number(room.p2_score);
    let aiAccumulated = 0;
    const targetScore = Number(room.target_score || 100);
    const aiLogs: { roll: number; accumulated: number; busted: boolean; held: boolean }[] = [];
    let aiBusted = false;
    let aiWon = false;

    // AI logic: Roll until accumulated >= 15 or wins
    const neededToWin = targetScore - aiScore;
    const aiHoldThreshold = Math.min(15, neededToWin);

    while (aiAccumulated < aiHoldThreshold && !aiBusted) {
      const roll = Math.floor(Math.random() * 6) + 1;
      if (roll === 1) {
        aiBusted = true;
        aiAccumulated = 0;
        aiLogs.push({ roll: 1, accumulated: 0, busted: true, held: false });
      } else {
        aiAccumulated += roll;
        const willHold = aiAccumulated >= aiHoldThreshold || aiScore + aiAccumulated >= targetScore;
        aiLogs.push({ roll, accumulated: aiAccumulated, busted: false, held: willHold });
      }
    }

    if (!aiBusted && aiAccumulated > 0) {
      aiScore += aiAccumulated;
      if (aiScore >= targetScore) {
        aiWon = true;
      }
    }

    if (aiWon) {
      // AI Wins match
      const houseProfit = Number(room.stake);
      await dbExecute(
        `UPDATE game_rooms SET p2_score = ?, current_accumulated = 0, status = 'COMPLETED', winner_id = 'AI_BOT' WHERE id = ?`,
        [aiScore, roomId]
      );

      await dbExecute(
        `UPDATE system_settings SET value = CAST(CAST(value AS NUMERIC) + ? AS TEXT) WHERE key = 'house_balance'`,
        [houseProfit]
      );

      const updatedUser = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);

      return NextResponse.json({
        success: true,
        winner: 'AI_BOT',
        p1Score: room.p1_score,
        p2Score: aiScore,
        currentTurn: 0,
        newBalance: Number(updatedUser[0]?.wallet_balance || 0),
        aiLogs,
      });
    }

    // AI turn finished, pass back to player
    await dbExecute(
      `UPDATE game_rooms SET p2_score = ?, current_turn = 0, current_accumulated = 0 WHERE id = ?`,
      [aiScore, roomId]
    );

    const updatedUser = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);

    return NextResponse.json({
      success: true,
      winner: null,
      p1Score: room.p1_score,
      p2Score: aiScore,
      currentTurn: 0,
      newBalance: Number(updatedUser[0]?.wallet_balance || 0),
      aiLogs,
    });
  } catch (error: any) {
    console.error('PvE AI Turn Error:', error);
    return NextResponse.json({ error: error.message || 'AI Turn failed' }, { status: 500 });
  }
}
