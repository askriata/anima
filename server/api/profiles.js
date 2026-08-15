const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const VALID_SITES = ['comics', 'social', 'movies', 'tv', 'games'];

// GET /profiles/me?site=comics -- get your profile for a given site
router.get('/profiles/me', requireAuth, async (req, res) => {
  const { site } = req.query;
  if (!VALID_SITES.includes(site)) {
    return res.status(400).json({ error: `site must be one of: ${VALID_SITES.join(', ')}` });
  }

  const { data, error } = await supabaseAdmin
    .from('site_profiles')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('site', site)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data); // null if they haven't set up a profile on this site yet
});

// POST /profiles/me  { site, username, display_name?, avatar_url?, bio? }
// Creates this user's profile for a given site the first time they visit it.
router.post('/profiles/me', requireAuth, async (req, res) => {
  const { site, username, display_name, avatar_url, bio } = req.body;

  if (!VALID_SITES.includes(site)) {
    return res.status(400).json({ error: `site must be one of: ${VALID_SITES.join(', ')}` });
  }
  if (!username) return res.status(400).json({ error: 'username is required' });

  // Make sure the account itself exists in `profiles` (first login ever).
  await supabaseAdmin.from('profiles').upsert({ id: req.user.id }, { onConflict: 'id' });

  const { data, error } = await supabaseAdmin
    .from('site_profiles')
    .insert({ user_id: req.user.id, site, username, display_name, avatar_url, bio })
    .select()
    .single();

  if (error) {
    // unique violation = username taken on that site
    if (error.code === '23505') {
      return res.status(409).json({ error: 'That username is already taken on this site' });
    }
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
});

module.exports = router;
