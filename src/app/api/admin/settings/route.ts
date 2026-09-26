import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbExecute } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { house_rake_percent, min_stake, max_stake, min_withdraw, target_score } = await req.json();

    if (house_rake_percent !== undefined) {
      await dbExecute(
        `INSERT INTO system_settings (key, value) VALUES ('house_rake_percent', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [String(house_rake_percent)]
      );
    }

    if (min_stake !== undefined) {
      await dbExecute(
        `INSERT INTO system_settings (key, value) VALUES ('min_stake', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [String(min_stake)]
      );
    }

    if (max_stake !== undefined) {
      await dbExecute(
        `INSERT INTO system_settings (key, value) VALUES ('max_stake', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [String(max_stake)]
      );
    }

    if (min_withdraw !== undefined) {
      await dbExecute(
        `INSERT INTO system_settings (key, value) VALUES ('min_withdraw', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [String(min_withdraw)]
      );
    }

    if (target_score !== undefined) {
      await dbExecute(
        `INSERT INTO system_settings (key, value) VALUES ('target_score', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [String(target_score)]
      );
    }

    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
