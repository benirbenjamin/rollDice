import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbQuery, dbExecute } from '@/lib/db';
import { initiateBankTransfer } from '@/lib/flutterwave';
import { sendUserWithdrawalRequestedEmail, sendAdminWithdrawalAlertEmail } from '@/lib/email';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    // Fetch dynamic minimum withdraw setting
    const settingsRows = await dbQuery(`SELECT value FROM system_settings WHERE key = 'min_withdraw'`);
    const minWithdraw = Number(settingsRows[0]?.value || 10);

    let last_withdraw_method = '';
    let last_withdraw_account = '';

    if (user) {
      const userRows = await dbQuery(`SELECT last_withdraw_method, last_withdraw_account FROM users WHERE id = ?`, [user.id]);
      if (userRows.length > 0) {
        last_withdraw_method = userRows[0].last_withdraw_method || '';
        last_withdraw_account = userRows[0].last_withdraw_account || '';
      }
    }

    return NextResponse.json({
      minWithdraw,
      last_withdraw_method,
      last_withdraw_account,
    });
  } catch (error: any) {
    return NextResponse.json({ minWithdraw: 10, last_withdraw_method: '', last_withdraw_account: '' });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please login to continue.' }, { status: 401 });
    }

    const { amount, account_bank, account_number, account_name, currency } = await req.json();
    const withdrawAmount = Number(amount);
    const selectedCurrency = currency || 'RWF';

    const settingsRows = await dbQuery(`SELECT value FROM system_settings WHERE key = 'min_withdraw'`);
    const minWithdraw = Number(settingsRows[0]?.value || 10);

    if (isNaN(withdrawAmount) || withdrawAmount < minWithdraw) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is ${selectedCurrency} ${minWithdraw.toLocaleString()}` },
        { status: 400 }
      );
    }

    if (!account_bank || !account_number) {
      return NextResponse.json({ error: 'Bank/Mobile details are required' }, { status: 400 });
    }

    // Check user wallet balance
    const userRows = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);
    const currentBalance = Number(userRows[0]?.wallet_balance || 0);

    if (currentBalance < withdrawAmount) {
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
    }

    const txId = 'tx_wth_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const flwRef = 'WTH_REF_' + Date.now();

    // 1. Store user's last withdraw method & account for future prefill
    await dbExecute(
      `UPDATE users SET last_withdraw_method = ?, last_withdraw_account = ? WHERE id = ?`,
      [account_bank, account_number, user.id]
    );

    // 2. Deduct user wallet balance (balance lock)
    await dbExecute(`UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?`, [withdrawAmount, user.id]);

    let withdrawalStatus = 'PENDING';
    let flutterwaveResMessage = '';

    // 3. Attempt automated transfer via Flutterwave API if API key is present
    if (process.env.FLUTTERWAVE_SECRET_KEY && !process.env.FLUTTERWAVE_SECRET_KEY.includes('TEST_DEFAULT')) {
      try {
        const transferRes = await initiateBankTransfer({
          account_bank,
          account_number,
          amount: withdrawAmount,
          currency: selectedCurrency,
          narration: 'RollDice Payout',
          reference: flwRef,
        });

        if (transferRes && (transferRes.status === 'success' || transferRes.status === 'NEW')) {
          withdrawalStatus = 'COMPLETED';
        } else {
          flutterwaveResMessage = transferRes?.message || 'Flutterwave transfer pending manual admin approval';
          withdrawalStatus = 'PENDING';
        }
      } catch (err: any) {
        console.warn('Flutterwave transfer call exception:', err);
        withdrawalStatus = 'PENDING';
      }
    }

    // 4. Record withdrawal transaction in database
    await dbExecute(
      `INSERT INTO transactions (id, user_id, type, amount, status, flutterwave_ref, payment_method, metadata)
       VALUES (?, ?, 'WITHDRAWAL', ?, ?, ?, ?, ?)`,
      [
        txId,
        user.id,
        withdrawAmount,
        withdrawalStatus,
        flwRef,
        account_bank,
        JSON.stringify({
          account_bank,
          account_number,
          account_name,
          currency: selectedCurrency,
          flw_note: flutterwaveResMessage,
        }),
      ]
    );

    // 5. Send notification emails to User and Admin
    await sendUserWithdrawalRequestedEmail({
      userEmail: user.email,
      userName: user.name,
      amount: withdrawAmount,
      currency: selectedCurrency,
      reference: flwRef,
      status: withdrawalStatus,
    });

    await sendAdminWithdrawalAlertEmail({
      userEmail: user.email,
      userName: user.name,
      amount: withdrawAmount,
      currency: selectedCurrency,
      reference: flwRef,
      accountBank: account_bank,
      accountNumber: account_number,
      status: withdrawalStatus,
    });

    const updatedUser = await dbQuery(`SELECT wallet_balance FROM users WHERE id = ?`, [user.id]);
    const newBalance = Number(updatedUser[0]?.wallet_balance || 0);

    return NextResponse.json({
      success: true,
      status: withdrawalStatus,
      message: withdrawalStatus === 'COMPLETED'
        ? `Withdrawal of ${selectedCurrency} ${withdrawAmount.toLocaleString()} processed successfully!`
        : `Withdrawal request of ${selectedCurrency} ${withdrawAmount.toLocaleString()} submitted and pending admin approval.`,
      newBalance,
      reference: flwRef,
    });
  } catch (error: any) {
    console.error('Withdrawal error:', error);
    return NextResponse.json({ error: error.message || 'Withdrawal failed' }, { status: 500 });
  }
}
