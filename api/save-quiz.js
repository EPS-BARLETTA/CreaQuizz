import { put, get } from '@vercel/blob';

function makeId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

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
    const payload = req.body;
    if (!payload || !Array.isArray(payload.questions) || payload.questions.length === 0) {
      return res.status(400).json({ error: 'Quiz invalide.' });
    }

    if (payload.questions.length > 50) {
      return res.status(400).json({ error: 'Trop de questions.' });
    }

    const id = makeId();
    const createdAt = payload.createdAt || new Date().toISOString();
    const title = String(payload.title || 'Quizz').slice(0, 100);
    const version = Number.isFinite(Number(payload.version)) ? Number(payload.version) : 13;
    const subject = String(payload.subject || '').trim().slice(0, 60);
    const level = String(payload.level || '').trim().slice(0, 40);
    const settings = payload.settings && typeof payload.settings === 'object' ? payload.settings : {};
    const pathname = `quizzes/${id}.json`;
    const data = JSON.stringify({
      app: 'quizz',
      version,
      title,
      subject,
      level,
      archived: false,
      settings,
      createdAt,
      questions: payload.questions,
    });

    await put(pathname, data, {
      access: 'private',
      contentType: 'application/json; charset=utf-8',
      addRandomSuffix: false,
    });

    const current = await readIndex();
    const entry = { id, title, subject, level, archived: false, mode: String(settings.mode || 'training'), count: payload.questions.length, createdAt, version };
    const items = [entry, ...current.filter((x) => x?.id !== id)];

    await put('quizzes/index.json', JSON.stringify({ items }), {
      access: 'private',
      contentType: 'application/json; charset=utf-8',
      addRandomSuffix: false,
      allowOverwrite: true,
    });


    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ id });
  } catch (error) {
    console.error('save-quiz error', error);
    return res.status(500).json({ error: 'Impossible de publier le quiz.' });
  }
}
