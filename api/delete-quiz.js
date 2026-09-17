import { del, get, put } from '@vercel/blob';

async function readIndex() {
  try {
    const result = await get('quizzes/index.json', { access: 'private', useCache: false });
    if (!result) return [];
    const text = await new Response(result.stream).text();
    const data = JSON.parse(text);
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  try {
    const id = String(req.body?.id || '').trim();
    if (!/^[A-Z2-9]{8}$/.test(id)) {
      return res.status(400).json({ error: 'Identifiant de quiz invalide.' });
    }

    await del(`quizzes/${id}.json`);

    const current = await readIndex();
    const items = current.filter((item) => item?.id !== id);

    await put('quizzes/index.json', JSON.stringify({ items }), {
      access: 'private',
      contentType: 'application/json; charset=utf-8',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('delete-quiz error', error);
    return res.status(500).json({ error: 'Impossible de supprimer le quiz.' });
  }
}
