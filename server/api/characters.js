const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const CHARACTER_SELECT = `
  *,
  character_voice_actors ( role, staff ( id, name, image_url ) )
`;

router.get('/characters', async (req, res) => {
  const { media_id } = req.query;
  let query = supabaseAdmin.from('characters').select(CHARACTER_SELECT);
  if (media_id) query = query.eq('media_id', media_id);

  const { data, error } = await query.order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /characters/search  { name: "..." }  -- kept as POST to match the original API shape
router.post('/characters/search', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const { data, error } = await supabaseAdmin
    .from('characters')
    .select(CHARACTER_SELECT)
    .ilike('name', `%${name}%`)
    .limit(5);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/characters', requireAuth, async (req, res) => {
  const { voice_actor_ids, ...fields } = req.body;

  const { data: created, error } = await supabaseAdmin
    .from('characters')
    .insert(fields)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  if (Array.isArray(voice_actor_ids) && voice_actor_ids.length) {
    await supabaseAdmin.from('character_voice_actors').insert(
      voice_actor_ids.map((staff_id) => ({ character_id: created.id, staff_id }))
    );
  }

  res.status(201).json(created);
});

module.exports = router;
