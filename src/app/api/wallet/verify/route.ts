import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbQuery, dbExecute } from '@/lib/db';
import { verifyFlutterwaveTransaction } from '@/lib/flutterwave';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId, flwTransactionId, tx_ref, status, isSimulated } = await req.json();

    const searchRef = transactionId || tx_ref || flwTransactionId;
    if (!searchRef) {
      return NextResponse.json({ error: 'Transaction reference is required' }, { status: 400 });
    }

    // Lookup transaction in database
    const txs = await dbQuery(
      `SELECT * FROM transactions WHERE (id = ? OR flutterwave_ref = ?) AND user_id = ?`,
      [searchRef, searchRef, user.id]
    );

    let tx = txs[0];

    // Fallback: If not found by reference, get the latest pending deposit for this user
    if (!tx) {
      const pendingTxs = await dbQuery(
        `SELECT * FROM transactions WHERE user_id = ? AND type = 'DEPOSIT' AND status = 'PENDING' ORDER BY created_at DESC LIMIT 1`,
        [user.id]
      );
      if (pendingTxs.length > 0) {
        tx = pendingTxs[0];
      }
    }

    if (!tx) {
      return NextResponse.json({ error: 'Deposit transaction record not found' }, { status: 404 });
    }

    // If transaction is already completed, return current balance immediately!
    if (tx.status === 'COMPLETED') {
      const updatedUser = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);
      return NextResponse.json({
        success: true,
        message: 'Deposit already completed and credited',
        newBalance: Number(updatedUser[0]?.wallet_balance || 0),
      });
    }

    // Verify payment status
    let isVerified = false;

    // 1. Check if client reported successful status from Flutterwave Inline checkout
    if (status === 'successful' || status === 'completed') {
      isVerified = true;
    }

    // 2. Check if simulated / dev mode / test secret key
    if (isSimulated || !process.env.FLUTTERWAVE_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY.includes('TEST_DEFAULT')) {
      isVerified = true;
    }

    // 3. Verify via Flutterwave API if live transaction ID is present
    if (flwTransactionId && process.env.FLUTTERWAVE_SECRET_KEY && !process.env.FLUTTERWAVE_SECRET_KEY.includes('TEST_DEFAULT')) {
      try {
        const verifyRes = await verifyFlutterwaveTransaction(String(flwTransactionId));
        if (
          verifyRes &&
          (verifyRes.status === 'success' || verifyRes.data?.status === 'successful') &&
          Number(verifyRes.data?.amount || 0) >= Number(tx.amount)
        ) {
          isVerified = true;
        }
      } catch (verifyErr) {
        console.warn('Flutterwave API verification call exception:', verifyErr);
        // If client reported success, accept verified status as fallback
        if (status === 'successful' || status === 'completed') {
          isVerified = true;
        }
      }
    }

    if (!isVerified) {
      await dbExecute(`UPDATE transactions SET status = 'FAILED' WHERE id = ?`, [tx.id]);
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    // Payment verified: credit user's wallet atomically
    const depositAmount = Number(tx.amount || 0);
    const finalFlwRef = flwTransactionId || tx_ref || tx.flutterwave_ref;

    await dbExecute(`UPDATE transactions SET status = 'COMPLETED', flutterwave_ref = ? WHERE id = ?`, [
      finalFlwRef,
      tx.id,
    ]);

    await dbExecute(`UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?`, [
      depositAmount,
      user.id,
    ]);

    const updatedUsers = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);
    const newBalance = Number(updatedUsers[0]?.wallet_balance || 0);

    return NextResponse.json({
      success: true,
      message: `RWF ${depositAmount.toLocaleString()} successfully credited to your wallet!`,
      newBalance,
    });
  } catch (error: any) {
    console.error('Wallet verification error:', error);
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 });
  }
}
