import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbQuery, dbExecute } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: roomId } = await params;

    const rooms = await dbQuery(
      `SELECT r.*, u1.name as player1_name, u2.name as player2_name, w.name as winner_name
       FROM game_rooms r
       LEFT JOIN users u1 ON r.player1_id = u1.id
       LEFT JOIN users u2 ON r.player2_id = u2.id
       LEFT JOIN users w ON r.winner_id = w.id
       WHERE r.id = ?`,
      [roomId]
    );

    if (rooms.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ room: rooms[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: roomId } = await params;
    const { action } = await req.json();

    const rooms = await dbQuery(`SELECT * FROM game_rooms WHERE id = ?`, [roomId]);
    if (rooms.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const room = rooms[0];

    // ACTION 1: JOIN ROOM
    if (action === 'JOIN') {
      if (room.player1_id === user.id) {
        return NextResponse.json({ success: true, message: 'Rejoined your created room' });
      }

      if (room.player2_id && room.player2_id !== user.id) {
        return NextResponse.json({ error: 'Room is already full' }, { status: 400 });
      }

      if (room.status !== 'WAITING' && room.player2_id !== user.id) {
        return NextResponse.json({ error: 'Game has already started' }, { status: 400 });
      }

      if (room.player2_id !== user.id) {
        const stakeAmount = Number(room.stake);
        const userRows = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);

        if (Number(userRows[0]?.wallet_balance || 0) < stakeAmount) {
          return NextResponse.json({ error: 'Insufficient wallet balance to join stake room' }, { status: 400 });
        }

        // Deduct stake for player 2
        await dbExecute(`UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?`, [stakeAmount, user.id]);

        // Update room status
        await dbExecute(
          `UPDATE game_rooms SET player2_id = ?, status = 'ACTIVE' WHERE id = ?`,
          [user.id, roomId]
        );

        // Record wager transaction
        await dbExecute(
          `INSERT INTO transactions (id, user_id, type, amount, status, metadata)
           VALUES (?, ?, 'WAGER', ?, 'COMPLETED', ?)`,
          ['tx_pvp_p2_' + Date.now(), user.id, stakeAmount, JSON.stringify({ roomId, mode: 'PVP' })]
        );
      }

      const updatedUser = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);

      return NextResponse.json({
        success: true,
        message: 'Joined room successfully',
        newBalance: Number(updatedUser[0]?.wallet_balance || 0),
      });
    }

    // Determine active player index (0 for player1, 1 for player2)
    const isPlayer1 = room.player1_id === user.id;
    const isPlayer2 = room.player2_id === user.id;

    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json({ error: 'You are not a participant in this room' }, { status: 403 });
    }

    const myTurnIndex = isPlayer1 ? 0 : 1;

    if (room.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Room is not in active game state' }, { status: 400 });
    }

    if (room.current_turn !== myTurnIndex) {
      return NextResponse.json({ error: 'It is not your turn to play' }, { status: 400 });
    }

    // ACTION 2: ROLL DICE
    if (action === 'ROLL') {
      const diceRoll = Math.floor(Math.random() * 6) + 1;
      let newAccumulated = room.current_accumulated;

      if (diceRoll === 1) {
        // BUST! Turn score lost, turn passes to opponent
        const nextTurn = myTurnIndex === 0 ? 1 : 0;
        await dbExecute(
          `UPDATE game_rooms SET current_turn = ?, current_accumulated = 0 WHERE id = ?`,
          [nextTurn, roomId]
        );

        return NextResponse.json({
          success: true,
          diceRoll,
          turnBusted: true,
          currentAccumulated: 0,
          currentTurn: nextTurn,
        });
      } else {
        newAccumulated += diceRoll;
        await dbExecute(`UPDATE game_rooms SET current_accumulated = ? WHERE id = ?`, [newAccumulated, roomId]);

        return NextResponse.json({
          success: true,
          diceRoll,
          turnBusted: false,
          currentAccumulated: newAccumulated,
          currentTurn: myTurnIndex,
        });
      }
    }

    // ACTION 3: HOLD SCORE
    if (action === 'HOLD') {
      const addedPoints = Number(room.current_accumulated);
      let newP1Score = Number(room.p1_score);
      let newP2Score = Number(room.p2_score);

      if (isPlayer1) {
        newP1Score += addedPoints;
      } else {
        newP2Score += addedPoints;
      }

      const targetScore = Number(room.target_score || 100);
      const isWin = isPlayer1 ? newP1Score >= targetScore : newP2Score >= targetScore;

      if (isWin) {
        // Winner declared!
        const winnerId = user.id;
        const rakeRows = await dbQuery(`SELECT value FROM system_settings WHERE key = 'house_rake_percent'`);
        const houseRakePercent = Number(rakeRows[0]?.value || 10);
        const stake = Number(room.stake);
        const totalPot = stake * 2;
        const houseRakeAmount = (totalPot * houseRakePercent) / 100;
        const winnerPayout = totalPot - houseRakeAmount;

        await dbExecute(
          `UPDATE game_rooms SET p1_score = ?, p2_score = ?, current_accumulated = 0, status = 'COMPLETED', winner_id = ?, rake_amount = ? WHERE id = ?`,
          [newP1Score, newP2Score, winnerId, houseRakeAmount, roomId]
        );

        // Credit winner wallet
        await dbExecute(`UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?`, [winnerPayout, winnerId]);

        // Update house revenue balance
        const houseRows = await dbQuery(`SELECT value FROM system_settings WHERE key = 'house_balance'`);
        const currentHouseBal = Number(houseRows[0]?.value || 0);
        const newHouseBal = (currentHouseBal + houseRakeAmount).toFixed(2);
        await dbExecute(`UPDATE system_settings SET value = ? WHERE key = 'house_balance'`, [newHouseBal]);

        // Record payout transaction
        await dbExecute(
          `INSERT INTO transactions (id, user_id, type, amount, status, metadata)
           VALUES (?, ?, 'PAYOUT', ?, 'COMPLETED', ?)`,
          ['tx_pvp_win_' + Date.now(), winnerId, winnerPayout, JSON.stringify({ roomId, rake: houseRakeAmount })]
        );

        const updatedUser = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);

        return NextResponse.json({
          success: true,
          isWin: true,
          winnerId,
          winnerPayout,
          p1Score: newP1Score,
          p2Score: newP2Score,
          newBalance: Number(updatedUser[0]?.wallet_balance || 0),
        });
      } else {
        // Switch turn to opponent
        const nextTurn = myTurnIndex === 0 ? 1 : 0;
        await dbExecute(
          `UPDATE game_rooms SET p1_score = ?, p2_score = ?, current_turn = ?, current_accumulated = 0 WHERE id = ?`,
          [newP1Score, newP2Score, nextTurn, roomId]
        );

        return NextResponse.json({
          success: true,
          isWin: false,
          p1Score: newP1Score,
          p2Score: newP2Score,
          currentTurn: nextTurn,
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Room Action Error:', error);
    return NextResponse.json({ error: error.message || 'Action failed' }, { status: 500 });
  }
}
