const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

router.get('/reviews', async (req, res) => {
  const { media_id } = req.query;
  let query = supabaseAdmin.from('reviews').select('*').order('created_at', { ascending: false });
  if (media_id) query = query.eq('media_id', media_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/reviews', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .insert({ ...req.body, user_id: req.user.id })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/reviews/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id) // only the author can edit their review
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Review not found or not yours' });
  res.json(data);
});

router.delete('/reviews/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Review not found or not yours' });
  res.json(data);
});

module.exports = router;
