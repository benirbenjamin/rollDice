import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbQuery } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Master Admin Access Required' }, { status: 403 });
    }

    // 1. Total house rake revenue & settings
    const settings = await dbQuery(`SELECT key, value FROM system_settings`);
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    const houseRevenue = Number(settingsMap.get('house_balance') || 0);

    // 2. User statistics
    const userStats = await dbQuery(`
      SELECT 
        COUNT(*) as total_users,
        SUM(wallet_balance) as total_user_balances
      FROM users
    `);

    // 3. Game Room statistics
    const gameStats = await dbQuery(`
      SELECT 
        COUNT(*) as total_games,
        SUM(stake) as total_wager_volume,
        SUM(rake_amount) as total_rake_collected
      FROM game_rooms
    `);

    // 4. Transaction summaries
    const txStats = await dbQuery(`
      SELECT 
        type, 
        COUNT(*) as count, 
        SUM(amount) as total_amount 
      FROM transactions 
      WHERE status = 'COMPLETED' 
      GROUP BY type
    `);

    // 5. Recent transactions list
    const recentTransactions = await dbQuery(`
      SELECT t.*, u.name as user_name, u.email as user_email
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC LIMIT 15
    `);

    return NextResponse.json({
      stats: {
        houseRevenue: Number(gameStats[0]?.total_rake_collected || houseRevenue || 0),
        totalUsers: Number(userStats[0]?.total_users || 0),
        totalUserBalances: Number(userStats[0]?.total_user_balances || 0),
        totalGames: Number(gameStats[0]?.total_games || 0),
        totalWagerVolume: Number(gameStats[0]?.total_wager_volume || 0),
        settings: Object.fromEntries(settingsMap),
      },
      txStats,
      recentTransactions,
    });
  } catch (error: any) {
    console.error('Admin Stats Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch admin stats' }, { status: 500 });
  }
}
