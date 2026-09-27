import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbQuery, dbExecute } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Master Admin Access Required' }, { status: 403 });
    }

    const deposits = await dbQuery(`
      SELECT 
        t.*, 
        u.id as user_id,
        u.name as user_name, 
        u.email as user_email, 
        u.role as user_role,
        u.status as user_status,
        u.wallet_balance as user_current_balance,
        u.last_withdraw_method,
        u.last_withdraw_account,
        u.created_at as user_created_at
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.type = 'DEPOSIT'
      ORDER BY t.created_at DESC
      LIMIT 200
    `);

    return NextResponse.json({
      success: true,
      deposits,
    });
  } catch (error: any) {
    console.error('Admin Deposits GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch deposits' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Master Admin Access Required' }, { status: 403 });
    }

    const { transactionId, action, reason } = await req.json();

    if (!transactionId || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload. Transaction ID and valid action required.' }, { status: 400 });
    }

    // Fetch deposit transaction record
    const txRows = await dbQuery(
      `SELECT t.*, u.name as user_name, u.email as user_email FROM transactions t LEFT JOIN users u ON t.user_id = u.id WHERE t.id = ?`,
      [transactionId]
    );

    if (txRows.length === 0) {
      return NextResponse.json({ error: 'Deposit transaction not found' }, { status: 404 });
    }

    const tx = txRows[0];

    if (tx.status === 'COMPLETED' && action === 'APPROVE') {
      return NextResponse.json({ error: 'Deposit is already completed and credited.' }, { status: 400 });
    }

    let meta: any = {};
    try {
      meta = JSON.parse(tx.metadata || '{}');
    } catch {}

    const amount = Number(tx.amount || 0);

    if (action === 'APPROVE') {
      // 1. Mark transaction status as COMPLETED
      await dbExecute(`UPDATE transactions SET status = 'COMPLETED' WHERE id = ?`, [transactionId]);

      // 2. Credit user wallet balance
      await dbExecute(`UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?`, [amount, tx.user_id]);

      return NextResponse.json({
        success: true,
        message: `Deposit of RWF ${amount.toLocaleString()} for ${tx.user_name} has been manually verified & credited!`,
      });
    } else if (action === 'REJECT') {
      meta.admin_reason = reason || 'Deposit rejected by Administrator';

      // Mark transaction status as FAILED
      await dbExecute(`UPDATE transactions SET status = 'FAILED', metadata = ? WHERE id = ?`, [
        JSON.stringify(meta),
        transactionId,
      ]);

      return NextResponse.json({
        success: true,
        message: `Deposit transaction marked as FAILED.`,
      });
    }
  } catch (error: any) {
    console.error('Admin Deposit Action Error:', error);
    return NextResponse.json({ error: error.message || 'Action failed' }, { status: 500 });
  }
}
