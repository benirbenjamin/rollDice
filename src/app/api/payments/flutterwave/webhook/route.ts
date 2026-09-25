import { NextResponse } from 'next/server';
import { dbQuery, dbExecute } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/flutterwave';

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('verif-hash');
    
    // In production, verify hash
    if (process.env.NODE_ENV === 'production' && !verifyWebhookSignature(signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = await req.json();

    if (payload.event === 'charge.completed' && payload.data?.status === 'successful') {
      const flwRef = payload.data.tx_ref;
      const amount = Number(payload.data.amount);

      const txs = await dbQuery(`SELECT * FROM transactions WHERE flutterwave_ref = ? OR id = ?`, [
        flwRef,
        flwRef,
      ]);

      if (txs.length > 0) {
        const tx = txs[0];
        if (tx.status !== 'COMPLETED') {
          await dbExecute(`UPDATE transactions SET status = 'COMPLETED' WHERE id = ?`, [tx.id]);
          await dbExecute(`UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?`, [
            amount,
            tx.user_id,
          ]);
        }
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
