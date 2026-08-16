const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const VALID_STATUSES = ['watching', 'completed', 'planning', 'paused', 'dropped'];

// GET /list -- the logged-in user's full watch/read list
router.get('/list', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('media_list_entries')
    .select('*, media ( id, name, media_type, show_type )')
    .eq('user_id', req.user.id)
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /list/:mediaId -- this user's single entry for one media (or null)
router.get('/list/:mediaId', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('media_list_entries')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('media_id', req.params.mediaId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /list  { media_id, status, score?, progress? } -- create or update
// (upsert on the user_id+media_id primary key, so this doubles as "edit")
router.post('/list', requireAuth, async (req, res) => {
  const { media_id, status, score, progress } = req.body;

  if (!media_id) return res.status(400).json({ error: 'media_id is required' });
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const { data, error } = await supabaseAdmin
    .from('media_list_entries')
    .upsert(
      { user_id: req.user.id, media_id, status, score, progress, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,media_id' }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /list/:mediaId -- remove from list entirely
router.delete('/list/:mediaId', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('media_list_entries')
    .delete()
    .eq('user_id', req.user.id)
    .eq('media_id', req.params.mediaId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;
