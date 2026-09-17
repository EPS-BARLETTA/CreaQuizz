import { get } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  try {
    const result = await get('quizzes/index.json', { access: 'private', useCache: false });
    if (!result) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ items: [] });
    }

    const text = await new Response(result.stream).text();
    const data = JSON.parse(text);
    const items = Array.isArray(data?.items) ? data.items : [];

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ items });
  } catch (error) {
    console.error('list-quizzes error', error);
    return res.status(200).json({ items: [] });
  }
}
