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

    if (room.current_turn !== 0) {
      return NextResponse.json({ error: 'It is not your turn' }, { status: 400 });
    }

    // Roll random die (1-6)
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    let newAccumulated = room.current_accumulated;
    let turnBusted = false;
    let nextTurn = 0;

    if (diceRoll === 1) {
      // BUST! Turn score set to 0 and turn passes to AI
      newAccumulated = 0;
      turnBusted = true;
      nextTurn = 1; // AI Turn

      await dbExecute(
        `UPDATE game_rooms SET current_turn = 1, current_accumulated = 0 WHERE id = ?`,
        [roomId]
      );
    } else {
      newAccumulated += diceRoll;
      await dbExecute(
        `UPDATE game_rooms SET current_accumulated = ? WHERE id = ?`,
        [newAccumulated, roomId]
      );
    }

    return NextResponse.json({
      success: true,
      diceRoll,
      turnBusted,
      currentAccumulated: newAccumulated,
      currentTurn: nextTurn,
      p1Score: room.p1_score,
      p2Score: room.p2_score,
    });
  } catch (error: any) {
    console.error('PvE Roll Error:', error);
    return NextResponse.json({ error: error.message || 'Roll failed' }, { status: 500 });
  }
}
