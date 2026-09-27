import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbQuery, dbExecute } from '@/lib/db';
import { initiateBankTransfer } from '@/lib/flutterwave';
import { sendUserWithdrawalApprovedEmail, sendUserWithdrawalRejectedEmail } from '@/lib/email';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const withdrawals = await dbQuery(`
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
      WHERE t.type = 'WITHDRAWAL'
      ORDER BY t.created_at DESC
      LIMIT 200
    `);

    return NextResponse.json({
      success: true,
      withdrawals,
    });
  } catch (error: any) {
    console.error('Admin Withdrawals GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch withdrawals' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { transactionId, action, reason } = await req.json();

    if (!transactionId || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload. Transaction ID and valid action required.' }, { status: 400 });
    }

    // Fetch transaction record
    const txRows = await dbQuery(
      `SELECT t.*, u.name as user_name, u.email as user_email FROM transactions t LEFT JOIN users u ON t.user_id = u.id WHERE t.id = ?`,
      [transactionId]
    );

    if (txRows.length === 0) {
      return NextResponse.json({ error: 'Withdrawal transaction not found' }, { status: 404 });
    }

    const tx = txRows[0];

    if (tx.status === 'COMPLETED' || tx.status === 'APPROVED') {
      return NextResponse.json({ error: 'Withdrawal has already been approved and completed.' }, { status: 400 });
    }
    if (tx.status === 'REJECTED') {
      return NextResponse.json({ error: 'Withdrawal has already been rejected.' }, { status: 400 });
    }

    let meta: any = {};
    try {
      meta = JSON.parse(tx.metadata || '{}');
    } catch {}

    const amount = Number(tx.amount || 0);
    const currency = meta.currency || 'RWF';

    if (action === 'APPROVE') {
      // Attempt Flutterwave payout if live API key present
      if (process.env.FLUTTERWAVE_SECRET_KEY && !process.env.FLUTTERWAVE_SECRET_KEY.includes('TEST_DEFAULT')) {
        try {
          await initiateBankTransfer({
            account_bank: meta.account_bank || tx.payment_method,
            account_number: meta.account_number,
            amount: amount,
            currency: currency,
            narration: 'RollDice Payout Approved',
            reference: tx.flutterwave_ref || tx.id,
          });
        } catch (flwErr) {
          console.warn('Flutterwave admin payout call warning:', flwErr);
        }
      }

      // Update transaction status
      await dbExecute(`UPDATE transactions SET status = 'COMPLETED' WHERE id = ?`, [transactionId]);

      // Email notification to user
      await sendUserWithdrawalApprovedEmail({
        userEmail: tx.user_email,
        userName: tx.user_name,
        amount: amount,
        currency: currency,
        reference: tx.flutterwave_ref || tx.id,
      });

      return NextResponse.json({
        success: true,
        message: `Withdrawal request for ${tx.user_name} (${currency} ${amount.toLocaleString()}) approved successfully.`,
      });
    } else if (action === 'REJECT') {
      const rejectReason = reason || 'Declined by Administrator';
      meta.admin_reason = rejectReason;

      // 1. Refund user wallet balance
      await dbExecute(`UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?`, [amount, tx.user_id]);

      // 2. Update transaction status
      await dbExecute(`UPDATE transactions SET status = 'REJECTED', metadata = ? WHERE id = ?`, [
        JSON.stringify(meta),
        transactionId,
      ]);

      // 3. Email notification to user
      await sendUserWithdrawalRejectedEmail({
        userEmail: tx.user_email,
        userName: tx.user_name,
        amount: amount,
        currency: currency,
        reference: tx.flutterwave_ref || tx.id,
        reason: rejectReason,
      });

      return NextResponse.json({
        success: true,
        message: `Withdrawal request rejected and ${currency} ${amount.toLocaleString()} re-credited to user's wallet balance.`,
      });
    }
  } catch (error: any) {
    console.error('Admin Withdrawal Action Error:', error);
    return NextResponse.json({ error: error.message || 'Action failed' }, { status: 500 });
  }
}
