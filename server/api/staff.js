const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

router.get('/staff', async (req, res) => {
  const { data, error } = await supabaseAdmin.from('staff').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /staff/search  { name: "...", type: "..." }
router.post('/staff/search', async (req, res) => {
  const { name, type } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  let query = supabaseAdmin.from('staff').select('*').ilike('name', `%${name}%`).limit(5);
  if (type) query = query.eq('staff_type', type);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/staff', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('staff').insert(req.body).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

module.exports = router;
