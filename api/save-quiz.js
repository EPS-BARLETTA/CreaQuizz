import { put } from '@vercel/blob';

function makeId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
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
    const pathname = `quizzes/${id}.json`;
    const data = JSON.stringify({
      app: 'quizz-maths',
      version: 4,
      title: String(payload.title || 'Quizz Maths').slice(0, 100),
      createdAt: payload.createdAt || new Date().toISOString(),
      questions: payload.questions,
    });

    await put(pathname, data, {
      access: 'private',
      contentType: 'application/json; charset=utf-8',
      addRandomSuffix: false,
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ id });
  } catch (error) {
    console.error('save-quiz error', error);
    return res.status(500).json({ error: 'Impossible de publier le quiz.' });
  }
}
