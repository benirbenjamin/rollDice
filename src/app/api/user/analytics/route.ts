import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbQuery } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user profile info including last withdrawal preferences
    const userRows = await dbQuery(
      `SELECT id, name, email, role, wallet_balance, is_verified, status, last_withdraw_method, last_withdraw_account, created_at FROM users WHERE id = ?`,
      [user.id]
    );
    const userInfo = userRows[0] || user;

    // Fetch transactions
    const txs = await dbQuery(
      `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
      [user.id]
    );

    // Fetch user game history
    const games = await dbQuery(
      `SELECT * FROM game_rooms WHERE (player1_id = ? OR player2_id = ?) AND status = 'COMPLETED' ORDER BY created_at DESC LIMIT 50`,
      [user.id, user.id]
    );

    let totalMatches = games.length;
    let wins = 0;
    let totalWinnings = 0;
    let totalWagered = 0;

    games.forEach((game: any) => {
      const stake = Number(game.stake || 0);
      totalWagered += stake;
      if (game.winner_id === user.id) {
        wins += 1;
        totalWinnings += stake * 1.8;
      }
    });

    // Calculate Deposit & Withdrawal sums
    let totalDeposited = 0;
    let totalWithdrawn = 0;

    txs.forEach((tx: any) => {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'DEPOSIT' && tx.status === 'COMPLETED') {
        totalDeposited += amt;
      } else if (tx.type === 'WITHDRAWAL' && (tx.status === 'COMPLETED' || tx.status === 'APPROVED' || tx.status === 'PENDING')) {
        totalWithdrawn += amt;
      }
    });

    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    return NextResponse.json({
      success: true,
      user: userInfo,
      stats: {
        totalMatches,
        wins,
        losses: totalMatches - wins,
        winRate,
        totalWinnings,
        totalWagered,
        totalDeposited,
        totalWithdrawn,
        balance: Number(userInfo.wallet_balance || 0),
      },
      recentTransactions: txs,
      recentGames: games,
    });
  } catch (error: any) {
    console.error('Analytics Fetch Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch analytics' }, { status: 500 });
  }
}
