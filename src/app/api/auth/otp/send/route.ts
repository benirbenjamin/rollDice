import { NextResponse } from 'next/server';
import { sendOtpEmail } from '@/lib/auth';
import { dbQuery, dbExecute } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email, name, mode = 'LOGIN' } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUsers = await dbQuery(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`, [cleanEmail]);
    const userExists = existingUsers.length > 0;

    if (mode === 'LOGIN') {
      if (!userExists) {
        return NextResponse.json(
          { error: 'No account found with this email. Please click "Register" below to create an account.' },
          { status: 404 }
        );
      }
    } else if (mode === 'REGISTER') {
      if (userExists && existingUsers[0].is_verified) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please switch to "Login" to sign in.' },
          { status: 400 }
        );
      }

      if (!userExists) {
        const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const displayName = name && name.trim() ? name.trim() : cleanEmail.split('@')[0];
        await dbExecute(
          `INSERT INTO users (id, name, email, role, wallet_balance, is_verified, status) VALUES (?, ?, ?, 'USER', 0.00, false, 'ACTIVE')`,
          [userId, displayName, cleanEmail]
        );
      } else if (name && name.trim()) {
        await dbExecute(`UPDATE users SET name = ? WHERE id = ?`, [name.trim(), existingUsers[0].id]);
      }
    }

    const result = await sendOtpEmail(cleanEmail, mode === 'REGISTER' ? 'SIGNUP' : 'LOGIN');
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 });
  }
}
