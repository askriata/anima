// Verifies the "Authorization: Bearer <token>" header sent by the frontend
// (the token Supabase Auth gives a logged-in user) and attaches the user
// to req.user. Use this on any route that creates/edits/deletes data --
// your original API had none of this, which meant anyone could write to
// it. This is the fix.

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// A separate lightweight client, using the anon key, purely for verifying
// tokens -- it never touches the database directly.
const authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization bearer token' });
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = data.user;
  next();
}

module.exports = { requireAuth };
