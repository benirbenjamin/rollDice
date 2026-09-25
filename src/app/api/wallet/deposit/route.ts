import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbExecute } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, currency } = await req.json();
    const depositAmount = Number(amount);

    if (isNaN(depositAmount) || depositAmount < 100) {
      return NextResponse.json({ error: 'Minimum deposit amount is 100' }, { status: 400 });
    }

    const selectedCurrency = currency || 'RWF';
    const txId = 'tx_dep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const flwRef = 'FLW_REF_' + Date.now();

    // Record pending transaction
    await dbExecute(
      `INSERT INTO transactions (id, user_id, type, amount, status, flutterwave_ref, payment_method, metadata)
       VALUES (?, ?, 'DEPOSIT', ?, 'PENDING', ?, 'FLUTTERWAVE', ?)`,
      [txId, user.id, depositAmount, flwRef, JSON.stringify({ currency: selectedCurrency })]
    );

    return NextResponse.json({
      success: true,
      transactionId: txId,
      reference: flwRef,
      amount: depositAmount,
      currency: selectedCurrency,
      customer: {
        email: user.email,
        name: user.name,
      },
      publicKey: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-DEFAULT-PUBLIC-KEY',
    });
  } catch (error: any) {
    console.error('Deposit initiation error:', error);
    return NextResponse.json({ error: error.message || 'Deposit failed' }, { status: 500 });
  }
}
