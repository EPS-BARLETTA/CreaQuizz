import { get } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  try {
    const id = String(req.query?.id || '').toUpperCase().trim();
    if (!/^[A-Z2-9]{8}$/.test(id)) {
      return res.status(400).json({ error: 'Identifiant de quiz invalide.' });
    }

    const pathname = `quizzes/${id}.json`;
    const result = await get(pathname, { access: 'private', useCache: false });

    if (!result) {
      return res.status(404).json({ error: 'Quiz introuvable.' });
    }

    const text = await new Response(result.stream).text();
    const data = JSON.parse(text);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (error) {
    console.error('get-quiz error', error);
    return res.status(404).json({ error: 'Quiz introuvable ou indisponible.' });
  }
}
