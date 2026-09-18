import { get, put } from '@vercel/blob';

async function readJson(pathname) {
  const result = await get(pathname, { access: 'private', useCache: false });
  if (!result) return null;
  return JSON.parse(await new Response(result.stream).text());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  try {
    const id = String(req.body?.id || '').toUpperCase().trim();
    if (!/^[A-Z2-9]{8}$/.test(id)) return res.status(400).json({ error: 'Identifiant de quiz invalide.' });

    const pathname = `quizzes/${id}.json`;
    const quiz = await readJson(pathname);
    if (!quiz) return res.status(404).json({ error: 'Quiz introuvable.' });

    const patch = req.body?.patch || {};
    if (typeof patch.title === 'string') quiz.title = patch.title.trim().slice(0, 100) || quiz.title;
    if (typeof patch.subject === 'string') quiz.subject = patch.subject.trim().slice(0, 60);
    if (typeof patch.level === 'string') quiz.level = patch.level.trim().slice(0, 40);
    if (typeof patch.archived === 'boolean') quiz.archived = patch.archived;

    await put(pathname, JSON.stringify(quiz), {
      access: 'private',
      contentType: 'application/json; charset=utf-8',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    const index = await readJson('quizzes/index.json') || { items: [] };
    const items = Array.isArray(index.items) ? index.items : [];
    const next = items.map((item) => item?.id === id ? {
      ...item,
      title: quiz.title,
      subject: quiz.subject || '',
      level: quiz.level || '',
      archived: !!quiz.archived,
      mode: quiz.settings?.mode || item.mode || 'training',
    } : item);

    await put('quizzes/index.json', JSON.stringify({ items: next }), {
      access: 'private',
      contentType: 'application/json; charset=utf-8',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, item: next.find((x) => x?.id === id) });
  } catch (error) {
    console.error('update-quiz error', error);
    return res.status(500).json({ error: 'Impossible de modifier le quiz.' });
  }
}
