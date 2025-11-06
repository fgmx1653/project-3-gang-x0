import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: Request) {
  try {
    // Return all menu items from the database
    const result = await pool.query('SELECT * FROM menu_items ORDER BY id');
    return NextResponse.json({ ok: true, items: result.rows });
  } catch (error) {
    console.error('Menu API error:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
