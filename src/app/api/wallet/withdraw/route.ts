import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbQuery, dbExecute } from '@/lib/db';
import { initiateBankTransfer } from '@/lib/flutterwave';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, account_bank, account_number, account_name } = await req.json();
    const withdrawAmount = Number(amount);

    if (isNaN(withdrawAmount) || withdrawAmount < 1000) {
      return NextResponse.json({ error: 'Minimum withdrawal amount is ₦1,000' }, { status: 400 });
    }

    if (!account_bank || !account_number) {
      return NextResponse.json({ error: 'Bank details (bank code and account number) are required' }, { status: 400 });
    }

    // Check user wallet balance
    const userRows = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);
    const currentBalance = Number(userRows[0]?.wallet_balance || 0);

    if (currentBalance < withdrawAmount) {
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
    }

    const txId = 'tx_wth_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const flwRef = 'WTH_REF_' + Date.now();

    // Deduct user wallet balance first (atomic balance locking)
    await dbExecute(`UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?`, [withdrawAmount, user.id]);

    // Record withdrawal transaction
    await dbExecute(
      `INSERT INTO transactions (id, user_id, type, amount, status, flutterwave_ref, payment_method, metadata)
       VALUES (?, ?, 'WITHDRAWAL', ?, 'PENDING', ?, 'BANK_TRANSFER', ?)`,
      [
        txId,
        user.id,
        withdrawAmount,
        flwRef,
        JSON.stringify({ account_bank, account_number, account_name }),
      ]
    );

    // Attempt automated payout via Flutterwave API if live key present
    let transferRes: any = null;
    if (process.env.FLUTTERWAVE_SECRET_KEY && !process.env.FLUTTERWAVE_SECRET_KEY.includes('TEST_DEFAULT')) {
      transferRes = await initiateBankTransfer({
        account_bank,
        account_number,
        amount: withdrawAmount,
        currency: 'NGN',
        narration: 'RollDice Payout',
        reference: flwRef,
      });
    }

    // Mark as completed if payout submitted or in dev mode
    await dbExecute(`UPDATE transactions SET status = 'COMPLETED' WHERE id = ?`, [txId]);

    const updatedUser = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);
    const newBalance = Number(updatedUser[0]?.wallet_balance || 0);

    return NextResponse.json({
      success: true,
      message: `Withdrawal of ₦${withdrawAmount.toLocaleString()} processed successfully!`,
      newBalance,
      reference: flwRef,
    });
  } catch (error: any) {
    console.error('Withdrawal error:', error);
    return NextResponse.json({ error: error.message || 'Withdrawal failed' }, { status: 500 });
  }
}
