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

    const { transactionId, flwTransactionId, isSimulated } = await req.json();

    const txs = await dbQuery(`SELECT * FROM transactions WHERE id = ? AND user_id = ?`, [
      transactionId,
      user.id,
    ]);

    if (txs.length === 0) {
      return NextResponse.json({ error: 'Transaction record not found' }, { status: 404 });
    }

    const tx = txs[0];

    if (tx.status === 'COMPLETED') {
      const updatedUser = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);
      return NextResponse.json({
        success: true,
        message: 'Transaction already completed',
        newBalance: Number(updatedUser[0].wallet_balance),
      });
    }

    // Check if test simulation mode or real Flutterwave verification
    let isVerified = false;

    if (isSimulated || process.env.NODE_ENV !== 'production' || !flwTransactionId) {
      // In development / demo mode or test key: approve deposit
      isVerified = true;
    } else {
      const verifyRes = await verifyFlutterwaveTransaction(flwTransactionId);
      if (
        verifyRes &&
        verifyRes.status === 'success' &&
        verifyRes.data &&
        verifyRes.data.status === 'successful' &&
        Number(verifyRes.data.amount) >= Number(tx.amount)
      ) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      await dbExecute(`UPDATE transactions SET status = 'FAILED' WHERE id = ?`, [transactionId]);
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    // Payment successful: credit user's wallet
    await dbExecute(`UPDATE transactions SET status = 'COMPLETED', flutterwave_ref = ? WHERE id = ?`, [
      flwTransactionId || tx.flutterwave_ref,
      transactionId,
    ]);

    await dbExecute(`UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?`, [
      Number(tx.amount),
      user.id,
    ]);

    const updatedUsers = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);
    const newBalance = Number(updatedUsers[0]?.wallet_balance || 0);

    return NextResponse.json({
      success: true,
      message: `₦${Number(tx.amount).toLocaleString()} credited to your wallet!`,
      newBalance,
    });
  } catch (error: any) {
    console.error('Wallet verification error:', error);
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 });
  }
}
