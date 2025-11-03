import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'Missing credentials' }, { status: 400 });
    }

    // NOTE: This example checks plaintext passwords as the project currently stores them that way.
    // In production you must store hashed passwords and compare using bcrypt or similar.
    // Include `ismanager` in the returned fields so the client can check manager status
    const result = await pool.query(
      'SELECT id, username, ismanager FROM employees WHERE username = $1 AND password = $2',
      [username, password]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      return NextResponse.json({ ok: true, user: { id: user.id, username: user.username, ismanager: user.ismanager } });
    }

    return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
