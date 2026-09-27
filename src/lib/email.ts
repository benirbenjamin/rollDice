import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'RollDice <onboarding@resend.dev>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@rolldice.com';

interface WithdrawalEmailData {
  userEmail: string;
  userName: string;
  amount: number;
  currency: string;
  reference: string;
  accountBank?: string;
  accountNumber?: string;
  status?: string;
  reason?: string;
}

// 1. Notify User that withdrawal request was created
export async function sendUserWithdrawalRequestedEmail(data: WithdrawalEmailData) {
  const { userEmail, userName, amount, currency, reference, status = 'PENDING' } = data;
  
  if (resend) {
    try {
      await resend.emails.send({
        from: SENDER_EMAIL,
        to: [userEmail],
        subject: `🎲 Withdrawal Request Received: ${currency} ${amount.toLocaleString()} [${status}]`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; background-color: #0b0f19; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #fbbf24; margin: 0; font-size: 24px;">🎲 RollDice Gaming Platform</h2>
              <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Withdrawal Request Confirmation</p>
            </div>
            
            <p style="font-size: 16px;">Hello <strong>${userName}</strong>,</p>
            <p style="font-size: 15px; color: #cbd5e1;">Your withdrawal request has been successfully registered on RollDice.</p>
            
            <div style="background-color: #1e293b; padding: 18px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #fbbf24;">
              <p style="margin: 4px 0; font-size: 14px;"><strong>Amount:</strong> <span style="color: #34d399; font-size: 18px; font-weight: bold;">${currency} ${amount.toLocaleString()}</span></p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Reference ID:</strong> <span style="color: #38bdf8; font-family: monospace;">${reference}</span></p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Status:</strong> <span style="background-color: #fbbf2420; color: #fbbf24; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${status}</span></p>
            </div>

            <p style="font-size: 13px; color: #94a3b8;">
              ${status === 'COMPLETED'
                ? 'Your payout has been processed and sent to your account directly.'
                : 'Your payout request is pending verification by our financial system or master administrator. You will receive an email update once processed.'}
            </p>

            <div style="text-align: center; margin-top: 30px; border-top: 1px solid #334155; padding-top: 15px;">
              <p style="font-size: 12px; color: #64748b;">© 2026 RollDice Platform. All rights reserved.</p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      console.warn('Failed to send user withdrawal email:', err);
    }
  } else {
    console.log(`[EMAIL LOG - USER WITHDRAWAL] To: ${userEmail}, Amount: ${currency} ${amount}, Status: ${status}`);
  }
}

// 2. Notify Admin about a new withdrawal request
export async function sendAdminWithdrawalAlertEmail(data: WithdrawalEmailData) {
  const { userEmail, userName, amount, currency, reference, accountBank, accountNumber, status = 'PENDING' } = data;

  if (resend) {
    try {
      await resend.emails.send({
        from: SENDER_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `⚠️ ACTION REQUIRED: New Withdrawal Request - ${currency} ${amount.toLocaleString()} by ${userName}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; background-color: #0f172a; color: #ffffff; border-radius: 12px; border: 1px solid #ef4444; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f87171; text-align: center; margin-top: 0;">🛡️ Admin Withdrawal Notification</h2>
            <p style="font-size: 15px;">A new user withdrawal request requires attention.</p>
            
            <div style="background-color: #1e293b; padding: 18px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 6px 0;"><strong>User:</strong> ${userName} (${userEmail})</p>
              <p style="margin: 6px 0;"><strong>Withdrawal Amount:</strong> <span style="color: #4ade80; font-weight: bold; font-size: 18px;">${currency} ${amount.toLocaleString()}</span></p>
              <p style="margin: 6px 0;"><strong>Payment Method:</strong> ${accountBank || 'N/A'}</p>
              <p style="margin: 6px 0;"><strong>Account Number:</strong> ${accountNumber || 'N/A'}</p>
              <p style="margin: 6px 0;"><strong>Reference:</strong> <code style="color: #38bdf8;">${reference}</code></p>
              <p style="margin: 6px 0;"><strong>Current Status:</strong> <span style="color: #fbbf24; font-weight: bold;">${status}</span></p>
            </div>

            <p style="font-size: 14px; color: #cbd5e1;">Please sign into the Master Admin Panel to review, approve, or reject this transaction.</p>
          </div>
        `,
      });
    } catch (err) {
      console.warn('Failed to send admin withdrawal alert email:', err);
    }
  } else {
    console.log(`[EMAIL LOG - ADMIN WITHDRAWAL ALERT] User: ${userEmail}, Amount: ${currency} ${amount}, Method: ${accountBank}, Account: ${accountNumber}`);
  }
}

// 3. Notify User when Admin Approves Withdrawal
export async function sendUserWithdrawalApprovedEmail(data: WithdrawalEmailData) {
  const { userEmail, userName, amount, currency, reference } = data;

  if (resend) {
    try {
      await resend.emails.send({
        from: SENDER_EMAIL,
        to: [userEmail],
        subject: `🎉 Withdrawal Approved & Dispatched: ${currency} ${amount.toLocaleString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #0b0f19; color: #ffffff; border-radius: 12px; border: 1px solid #10b981;">
            <h2 style="color: #34d399; text-align: center;">✅ Withdrawal Approved!</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Great news! Your withdrawal request of <strong>${currency} ${amount.toLocaleString()}</strong> has been approved by our master administrator and successfully dispatched to your account.</p>
            <div style="background-color: #1e293b; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 4px 0;"><strong>Reference:</strong> ${reference}</p>
              <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #34d399; font-weight: bold;">APPROVED & COMPLETED</span></p>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">Thank you for playing on RollDice!</p>
          </div>
        `,
      });
    } catch (err) {
      console.warn('Failed to send approval email:', err);
    }
  } else {
    console.log(`[EMAIL LOG - APPROVED] User: ${userEmail}, Amount: ${currency} ${amount}`);
  }
}

// 4. Notify User when Admin Rejects Withdrawal
export async function sendUserWithdrawalRejectedEmail(data: WithdrawalEmailData) {
  const { userEmail, userName, amount, currency, reference, reason } = data;

  if (resend) {
    try {
      await resend.emails.send({
        from: SENDER_EMAIL,
        to: [userEmail],
        subject: `❌ Withdrawal Request Updated: ${currency} ${amount.toLocaleString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #0b0f19; color: #ffffff; border-radius: 12px; border: 1px solid #ef4444;">
            <h2 style="color: #f87171; text-align: center;">Notice: Withdrawal Request Rejected</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Your withdrawal request of <strong>${currency} ${amount.toLocaleString()}</strong> could not be completed at this time.</p>
            
            <div style="background-color: #1e293b; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444;">
              <p style="margin: 4px 0;"><strong>Reference:</strong> ${reference}</p>
              <p style="margin: 4px 0;"><strong>Reason:</strong> ${reason || 'Details provided in account dashboard'}</p>
              <p style="margin: 4px 0;"><strong>Action Taken:</strong> <span style="color: #4ade80; font-weight: bold;">${currency} ${amount.toLocaleString()} HAS BEEN RE-CREDITED TO YOUR WALLET BALANCE.</span></p>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">You may submit a new withdrawal request or contact support if you need assistance.</p>
          </div>
        `,
      });
    } catch (err) {
      console.warn('Failed to send rejection email:', err);
    }
  } else {
    console.log(`[EMAIL LOG - REJECTED] User: ${userEmail}, Amount: ${currency} ${amount}, Reason: ${reason}`);
  }
}
