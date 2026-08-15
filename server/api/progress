const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

// GET /progress?media_id=X -- current user's progress across every unit of
// a media, for rendering an episode/chapter list with each one's state.
router.get('/progress', requireAuth, async (req, res) => {
  const { media_id } = req.query;
  if (!media_id) return res.status(400).json({ error: 'media_id is required' });

  const { data, error } = await supabaseAdmin
    .from('user_unit_progress')
    .select('*, media_units!inner ( id, unit_type, number, media_id )')
    .eq('user_id', req.user.id)
    .eq('media_units.media_id', media_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /units/:id/log -- current user's full rating/reread history for one unit
router.get('/units/:id/log', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('user_unit_log')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('unit_id', req.params.id)
    .order('consumed_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /units/:id/log  { rating?, notes?, is_reread? }
// Records one watch/read event and rolls the "current state" summary
// (user_unit_progress) forward. This is what lets a reread get its own
// rating instead of overwriting the first read's.
router.post('/units/:id/log', requireAuth, async (req, res) => {
  const { rating, notes, is_reread = false } = req.body;
  const unit_id = req.params.id;

  const { data: entry, error: logError } = await supabaseAdmin
    .from('user_unit_log')
    .insert({ user_id: req.user.id, unit_id, rating, notes, is_reread })
    .select()
    .single();

  if (logError) return res.status(500).json({ error: logError.message });

  // times_consumed is a +1, which upsert can't express directly --
  // read the current count, then write the new total.
  const { data: existing } = await supabaseAdmin
    .from('user_unit_progress')
    .select('times_consumed')
    .eq('user_id', req.user.id)
    .eq('unit_id', unit_id)
    .maybeSingle();

  const { error: progressError } = await supabaseAdmin.from('user_unit_progress').upsert(
    {
      user_id: req.user.id,
      unit_id,
      times_consumed: (existing?.times_consumed || 0) + 1,
      latest_rating: rating ?? null,
      latest_at: entry.consumed_at,
    },
    { onConflict: 'user_id,unit_id' }
  );

  if (progressError) return res.status(500).json({ error: progressError.message });
  res.status(201).json(entry);
});

// DELETE /units/:id/log/:logId -- remove one history entry (e.g. logged by
// mistake) and recompute the summary row from whatever's left.
router.delete('/units/:id/log/:logId', requireAuth, async (req, res) => {
  const unit_id = req.params.id;

  const { data: deleted, error: deleteError } = await supabaseAdmin
    .from('user_unit_log')
    .delete()
    .eq('id', req.params.logId)
    .eq('user_id', req.user.id)
    .select()
    .maybeSingle();

  if (deleteError) return res.status(500).json({ error: deleteError.message });
  if (!deleted) return res.status(404).json({ error: 'Log entry not found or not yours' });

  const { data: remaining } = await supabaseAdmin
    .from('user_unit_log')
    .select('rating, consumed_at')
    .eq('user_id', req.user.id)
    .eq('unit_id', unit_id)
    .order('consumed_at', { ascending: false });

  if (!remaining || remaining.length === 0) {
    await supabaseAdmin
      .from('user_unit_progress')
      .delete()
      .eq('user_id', req.user.id)
      .eq('unit_id', unit_id);
  } else {
    await supabaseAdmin.from('user_unit_progress').upsert(
      {
        user_id: req.user.id,
        unit_id,
        times_consumed: remaining.length,
        latest_rating: remaining[0].rating,
        latest_at: remaining[0].consumed_at,
      },
      { onConflict: 'user_id,unit_id' }
    );
  }

  res.status(204).send();
});

module.exports = router;
