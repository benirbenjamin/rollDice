import { NextResponse } from 'next/server';
import { sendOtpEmail } from '@/lib/auth';
import { dbQuery, dbExecute } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists, if not auto register as unverified or update name
    const existingUsers = await dbQuery(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`, [cleanEmail]);

    if (existingUsers.length === 0) {
      const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const displayName = name ? name.trim() : cleanEmail.split('@')[0];
      await dbExecute(
        `INSERT INTO users (id, name, email, role, wallet_balance, is_verified, status) VALUES (?, ?, ?, 'USER', 0.00, false, 'ACTIVE')`,
        [userId, displayName, cleanEmail]
      );
    }

    const result = await sendOtpEmail(cleanEmail, existingUsers.length > 0 ? 'LOGIN' : 'SIGNUP');

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 });
  }
}
