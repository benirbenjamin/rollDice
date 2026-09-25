import { NextResponse } from 'next/server';
import { verifyOtpCode, createSessionToken } from '@/lib/auth';
import { dbQuery, dbExecute } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and OTP code are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const isValid = await verifyOtpCode(cleanEmail, code.trim());

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired OTP code' }, { status: 400 });
    }

    // Mark user as verified and get full record
    await dbExecute(`UPDATE users SET is_verified = 1 WHERE LOWER(email) = LOWER(?)`, [cleanEmail]);

    const users = await dbQuery(`SELECT id, name, email, role, wallet_balance FROM users WHERE LOWER(email) = LOWER(?)`, [cleanEmail]);

    if (users.length === 0) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const user = users[0];
    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      wallet_balance: Number(user.wallet_balance || 0),
    };

    const token = createSessionToken(sessionData);

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: sessionData,
    });

    response.cookies.set('rolldice_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json({ error: error.message || 'Failed to verify OTP' }, { status: 500 });
  }
}
