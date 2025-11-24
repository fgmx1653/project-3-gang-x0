import { NextResponse } from 'next/server';
import { Translate } from '@google-cloud/translate/build/src/v2';

const translate = new Translate();

export async function POST(req: Request) {
  let text = '';
  let target = '';
  try {
    const body = await req.json();
    text = typeof body.text === 'string' ? body.text : '';
    target = typeof body.target === 'string' ? body.target : 'en';
    if (!text || !target || target === 'en') {
      return NextResponse.json({ translation: text });
    }
    const [translation] = await translate.translate(text, target);
    return NextResponse.json({ translation });
  } catch (err) {
    console.error('Translation API error:', err);
    return NextResponse.json({ translation: text, error: 'Translation failed' }, { status: 500 });
  }
}
