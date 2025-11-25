/**
 * Translate text to target language using Google Cloud Translation API via server API route
 * @param text - The text to translate
 * @param target - The target language code (e.g. 'es', 'fr', 'zh')
 * @returns Translated string
 */
export async function translateText(text: string, target: string): Promise<string> {
  if (!text || !target || target === 'en') return text;
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target }),
    });
    const data = await res.json();
    return data.translation ?? text;
  } catch (err) {
    console.error('Translation fetch error:', err);
    return text;
  }
}
