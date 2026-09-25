import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbQuery, dbExecute } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await dbQuery(
      `SELECT id, name, email, role, wallet_balance, status, is_verified, created_at FROM users ORDER BY created_at DESC LIMIT 100`
    );

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, action, amount, newStatus, newRole } = await req.json();

    if (action === 'ADJUST_BALANCE') {
      const adjustment = Number(amount);
      if (isNaN(adjustment)) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
      }
      await dbExecute(`UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?`, [adjustment, userId]);

      await dbExecute(
        `INSERT INTO transactions (id, user_id, type, amount, status, metadata)
         VALUES (?, ?, 'ADMIN_ADJUST', ?, 'COMPLETED', ?)`,
        ['tx_adj_' + Date.now(), userId, Math.abs(adjustment), JSON.stringify({ reason: 'Admin manual balance adjustment' })]
      );
    } else if (action === 'SET_STATUS') {
      await dbExecute(`UPDATE users SET status = ? WHERE id = ?`, [newStatus, userId]);
    } else if (action === 'SET_ROLE') {
      await dbExecute(`UPDATE users SET role = ? WHERE id = ?`, [newRole, userId]);
    }

    const updatedUser = await dbQuery(`SELECT * FROM users WHERE id = ?`, [userId]);

    return NextResponse.json({ success: true, user: updatedUser[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
