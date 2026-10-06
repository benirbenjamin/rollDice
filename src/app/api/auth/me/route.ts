import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDeviceFingerprint } from '@/lib/newPlayerEngine';
import { dbExecute } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Automatically associate / update device fingerprint
    try {
      const deviceFp = getDeviceFingerprint(req);
      await dbExecute(`UPDATE users SET device_fingerprint = ? WHERE id = ? AND (device_fingerprint IS NULL OR device_fingerprint = '')`, [
        deviceFp,
        user.id,
      ]);
    } catch {}

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
