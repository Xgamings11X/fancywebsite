import { serialize } from 'cookie';
export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  res.setHeader('Set-Cookie', [
    serialize('token',       '', { httpOnly:true, sameSite:'lax', maxAge:0, path:'/' }),
    serialize('admin_token', '', { httpOnly:true, sameSite:'lax', maxAge:0, path:'/' }),
  ]);
  return res.json({ success:true });
}
