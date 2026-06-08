// Admin Settings API — GET & PATCH
import { Settings } from '../../../lib/storage.js';
import { verifyToken } from '../../../lib/auth.js';
import { parse } from 'cookie';

function auth(req) {
  const t = parse(req.headers.cookie || '').admin_token || req.headers.authorization?.replace('Bearer ', '');
  const u = verifyToken(t);
  return u?.type === 'admin';
}

export default function handler(req, res) {
  if (!auth(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      return res.json({ success: true, settings: Settings.get() });
    }

    if (req.method === 'PATCH' || req.method === 'POST') {
      const patch = req.body;
      if (!patch || typeof patch !== 'object')
        return res.status(400).json({ success: false, message: 'Body tidak valid' });
      Settings.set(patch);
      return res.json({ success: true, settings: Settings.get() });
    }

    return res.status(405).end();
  } catch (e) {
    console.error('[admin/settings]', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
}
