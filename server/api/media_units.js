const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

// GET /media/:mediaId/units?type=episode
router.get('/media/:mediaId/units', async (req, res) => {
  const { type } = req.query;
  let query = supabaseAdmin
    .from('media_units')
    .select('*, arcs ( id, name )')
    .eq('media_id', req.params.mediaId)
    .order('number', { ascending: true });

  if (type) query = query.eq('unit_type', type);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /units/:id
router.get('/units/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('media_units')
    .select('*, arcs ( id, name )')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Unit not found' });
  res.json(data);
});

// POST /media/:mediaId/units  { unit_type, number, title?, released_at?, arc_id? }
router.post('/media/:mediaId/units', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('media_units')
    .insert({ ...req.body, media_id: req.params.mediaId })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// POST /media/:mediaId/units/bulk  { unit_type, count, starting_number? }
// Convenience for adding e.g. "episodes 1-24" at once instead of one call each.
router.post('/media/:mediaId/units/bulk', requireAuth, async (req, res) => {
  const { unit_type, count, starting_number = 1 } = req.body;
  if (!unit_type || !count) {
    return res.status(400).json({ error: 'unit_type and count are required' });
  }

  const rows = Array.from({ length: count }, (_, i) => ({
    media_id: req.params.mediaId,
    unit_type,
    number: starting_number + i,
  }));

  const { data, error } = await supabaseAdmin.from('media_units').insert(rows).select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /units/:id
router.put('/units/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('media_units')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Unit not found' });
  res.json(data);
});

// DELETE /units/:id
router.delete('/units/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('media_units')
    .delete()
    .eq('id', req.params.id)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Unit not found' });
  res.json(data);
});

module.exports = router;
