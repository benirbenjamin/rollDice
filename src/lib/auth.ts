import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { dbQuery, dbExecute } from './db';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'roll-dice-super-secret-jwt-key-2026';
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  wallet_balance: number;
}

// Generate random 6-digit OTP code
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Save OTP to DB and send via Resend
export async function sendOtpEmail(email: string, type: 'LOGIN' | 'SIGNUP') {
  const otp = generateOTP();
  const id = 'otp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

  // Store in database
  await dbExecute(
    `INSERT INTO otp_codes (id, email, code, type, expires_at) VALUES (?, ?, ?, ?, ?)`,
    [id, email.toLowerCase(), otp, type, expiresAt]
  );

  let sentStatus = false;
  let devCodeMessage = '';

  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.SENDER_EMAIL || 'RollDice <onboarding@resend.dev>',
        to: [email],
        subject: `Your RollDice Verification Code: ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #ffffff; border-radius: 10px;">
            <h2 style="color: #38bdf8; text-align: center;">🎲 RollDice Security OTP</h2>
            <p style="font-size: 16px;">Hello,</p>
            <p style="font-size: 16px;">Your One-Time Verification Code for <strong>${type}</strong> is:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; background-color: #1e293b; padding: 12px 24px; letter-spacing: 6px; color: #4ade80; border: 2px solid #38bdf8; border-radius: 8px;">${otp}</span>
            </div>
            <p style="color: #94a3b8; font-size: 14px; text-align: center;">This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
          </div>
        `,
      });
      sentStatus = true;
    } catch (err) {
      console.warn('Resend email failed, fallback to dev response:', err);
      devCodeMessage = ` (Dev OTP: ${otp})`;
    }
  } else {
    console.log(`[DEV MODE OTP] Email: ${email} | Code: ${otp}`);
    devCodeMessage = ` (Dev OTP: ${otp})`;
  }

  return { success: true, message: `OTP sent to ${email}${devCodeMessage}`, devOtp: otp };
}

// Verify OTP
export async function verifyOtpCode(email: string, code: string): Promise<boolean> {
  const rows = await dbQuery(
    `SELECT * FROM otp_codes WHERE LOWER(email) = LOWER(?) AND code = ? AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1`,
    [email, code]
  );

  if (rows.length === 0) return false;

  // Delete used OTP
  await dbExecute(`DELETE FROM otp_codes WHERE id = ?`, [rows[0].id]);
  return true;
}

// JWT Token Creation & Cookie Management
export function createSessionToken(user: UserSession): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('rolldice_session')?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const users = await dbQuery(`SELECT id, name, email, role, wallet_balance, status FROM users WHERE id = ?`, [decoded.id]);
    
    if (users.length === 0 || users[0].status === 'BANNED') return null;

    return {
      id: users[0].id,
      name: users[0].name,
      email: users[0].email,
      role: users[0].role,
      wallet_balance: Number(users[0].wallet_balance || 0),
    };
  } catch {
    return null;
  }
}
