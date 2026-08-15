const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

router.get('/genres', async (req, res) => {
  const { data, error } = await supabaseAdmin.from('genres').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/genres', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('genres').insert(req.body).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

module.exports = router;
