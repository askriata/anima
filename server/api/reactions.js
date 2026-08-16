const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const VALID_TARGETS = ['media', 'character', 'staff', 'review', 'comment'];
const VALID_REACTIONS = ['like', 'dislike', 'favorite'];

// POST /reactions  { target_type, target_id, reaction_type }
router.post('/reactions', requireAuth, async (req, res) => {
  const { target_type, target_id, reaction_type } = req.body;

  if (!VALID_TARGETS.includes(target_type) || !VALID_REACTIONS.includes(reaction_type)) {
    return res.status(400).json({ error: 'Invalid target_type or reaction_type' });
  }

  const { data, error } = await supabaseAdmin
    .from('reactions')
    .upsert(
      { user_id: req.user.id, target_type, target_id, reaction_type },
      { onConflict: 'user_id,target_type,target_id,reaction_type' }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /reactions  { target_type, target_id, reaction_type } -- un-react
router.delete('/reactions', requireAuth, async (req, res) => {
  const { target_type, target_id, reaction_type } = req.body;

  const { error } = await supabaseAdmin
    .from('reactions')
    .delete()
    .eq('user_id', req.user.id)
    .eq('target_type', target_type)
    .eq('target_id', target_id)
    .eq('reaction_type', reaction_type);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;
