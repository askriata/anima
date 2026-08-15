const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

router.get('/threads', async (req, res) => {
  const { media_id } = req.query;
  let query = supabaseAdmin.from('threads').select('*, thread_labels ( categories ( id, name ) )');
  if (media_id) query = query.eq('media_id', media_id);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/threads', requireAuth, async (req, res) => {
  const { label_ids, ...fields } = req.body;

  const { data: created, error } = await supabaseAdmin
    .from('threads')
    .insert({ ...fields, user_id: req.user.id })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  if (Array.isArray(label_ids) && label_ids.length) {
    await supabaseAdmin
      .from('thread_labels')
      .insert(label_ids.map((category_id) => ({ thread_id: created.id, category_id })));
  }

  res.status(201).json(created);
});

// GET /threads/:id/comments
router.get('/threads/:id/comments', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('comments')
    .select('*')
    .eq('thread_id', req.params.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /threads/:id/comments  { message }
router.post('/threads/:id/comments', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('comments')
    .insert({ thread_id: req.params.id, user_id: req.user.id, message: req.body.message })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Soft-delete a comment (matches the original `_deleted` flag pattern)
router.delete('/comments/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('comments')
    .update({ is_deleted: true })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Comment not found or not yours' });
  res.json(data);
});

module.exports = router;
