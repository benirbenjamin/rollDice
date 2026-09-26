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

    const newP1Score = Number(room.p1_score) + Number(room.current_accumulated);
    const targetScore = Number(room.target_score || 100);

    // Fetch house rake percent setting
    const rakeRows = await dbQuery(`SELECT value FROM system_settings WHERE key = 'house_rake_percent'`);
    const houseRakePercent = Number(rakeRows[0]?.value || 10);

    // Player wins check
    if (newP1Score >= targetScore) {
      const stake = Number(room.stake);
      const totalPot = stake * 2;
      const houseRakeAmount = (totalPot * houseRakePercent) / 100;
      const winnerPayout = totalPot - houseRakeAmount;

      // Update room status
      await dbExecute(
        `UPDATE game_rooms SET p1_score = ?, current_accumulated = 0, status = 'COMPLETED', winner_id = ?, rake_amount = ? WHERE id = ?`,
        [newP1Score, user.id, houseRakeAmount, roomId]
      );

      // Credit player wallet
      await dbExecute(`UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?`, [winnerPayout, user.id]);

      // Record house rake gain in settings
      const houseRows = await dbQuery(`SELECT value FROM system_settings WHERE key = 'house_balance'`);
      const currentHouseBal = Number(houseRows[0]?.value || 0);
      const newHouseBal = (currentHouseBal + houseRakeAmount).toFixed(2);
      await dbExecute(`UPDATE system_settings SET value = ? WHERE key = 'house_balance'`, [newHouseBal]);

      // Record Payout transaction
      await dbExecute(
        `INSERT INTO transactions (id, user_id, type, amount, status, metadata)
         VALUES (?, ?, 'PAYOUT', ?, 'COMPLETED', ?)`,
        ['tx_pay_' + Date.now(), user.id, winnerPayout, JSON.stringify({ roomId, rake: houseRakeAmount })]
      );

      const updatedUser = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);

      return NextResponse.json({
        success: true,
        winner: 'PLAYER',
        p1Score: newP1Score,
        p2Score: room.p2_score,
        winnerPayout,
        newBalance: Number(updatedUser[0]?.wallet_balance || 0),
        aiLogs: [],
      });
    }

    // Player held score, now simulate AI Turn
    let aiScore = Number(room.p2_score);
    let aiAccumulated = 0;
    const aiLogs: { roll: number; accumulated: number; busted: boolean; held: boolean }[] = [];
    let aiBusted = false;
    let aiWon = false;

    // AI strategy: Roll until accumulated >= 15 or (aiScore + accumulated) >= targetScore
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
      // AI Wins! Player loses stake. House keeps total pot minus zero payout
      const houseProfit = Number(room.stake);
      await dbExecute(
        `UPDATE game_rooms SET p1_score = ?, p2_score = ?, current_accumulated = 0, status = 'COMPLETED', winner_id = 'AI_BOT' WHERE id = ?`,
        [newP1Score, aiScore, roomId]
      );

      // Record house gain
      const houseRows = await dbQuery(`SELECT value FROM system_settings WHERE key = 'house_balance'`);
      const currentHouseBal = Number(houseRows[0]?.value || 0);
      const newHouseBal = (currentHouseBal + houseProfit).toFixed(2);
      await dbExecute(`UPDATE system_settings SET value = ? WHERE key = 'house_balance'`, [newHouseBal]);

      const updatedUser = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);

      return NextResponse.json({
        success: true,
        winner: 'AI_BOT',
        p1Score: newP1Score,
        p2Score: aiScore,
        newBalance: Number(updatedUser[0]?.wallet_balance || 0),
        aiLogs,
      });
    }

    // Game continues: Update room scores and set turn back to player
    await dbExecute(
      `UPDATE game_rooms SET p1_score = ?, p2_score = ?, current_turn = 0, current_accumulated = 0 WHERE id = ?`,
      [newP1Score, aiScore, roomId]
    );

    const updatedUser = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);

    return NextResponse.json({
      success: true,
      winner: null,
      p1Score: newP1Score,
      p2Score: aiScore,
      currentTurn: 0,
      newBalance: Number(updatedUser[0]?.wallet_balance || 0),
      aiLogs,
    });
  } catch (error: any) {
    console.error('PvE Hold Error:', error);
    return NextResponse.json({ error: error.message || 'Hold operation failed' }, { status: 500 });
  }
}
