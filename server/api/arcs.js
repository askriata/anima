const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

// GET /media/:mediaId/arcs -- arcs with their units nested, in order
router.get('/media/:mediaId/arcs', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('arcs')
    .select('*, media_units ( id, unit_type, number, title )')
    .eq('media_id', req.params.mediaId)
    .order('order_index', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /media/:mediaId/arcs  { name, order_index? }
router.post('/media/:mediaId/arcs', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('arcs')
    .insert({ ...req.body, media_id: req.params.mediaId })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /arcs/:id
router.put('/arcs/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('arcs')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Arc not found' });
  res.json(data);
});

// DELETE /arcs/:id -- units in this arc get arc_id set to null (fk is
// "on delete set null"), they are NOT deleted along with the arc
router.delete('/arcs/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('arcs')
    .delete()
    .eq('id', req.params.id)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Arc not found' });
  res.json(data);
});

module.exports = router;
