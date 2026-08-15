const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const VALID_TYPES = ['anime', 'manga', 'light_novel', 'visual_novel'];

// A single reusable select string that pulls in genres/studios/stats via
// Postgres joins -- this replaces what used to require separate populate
// calls or manual lookups in the Mongo version.
const MEDIA_SELECT = `
  *,
  media_genres ( genres ( id, name ) ),
  media_studios ( role, studios ( id, name ) ),
  media_stats ( * )
`;

// GET /media -- list, with optional filters: ?type=anime&genre=Action&status=Finished
router.get('/media', async (req, res) => {
  const { type, status, studio } = req.query;

  let query = supabaseAdmin.from('media').select(MEDIA_SELECT);

  if (type) query = query.eq('media_type', type);
  if (status) query = query.eq('status', status);

  const { data, error } = await query.order('id', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });

  // Studio filtering happens after the join since it's a nested relation;
  // for high-traffic filters like this, an RPC/view is worth adding later.
  const filtered = studio
    ? data.filter((m) => m.media_studios.some((ms) => ms.studios?.name === studio))
    : data;

  res.json(filtered);
});

// GET /media/:id
router.get('/media/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('media')
    .select(MEDIA_SELECT)
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Media not found' });
  res.json(data);
});

// GET /:category -- e.g. /anime, /manga (kept for compatibility with the old routes)
router.get('/:category', async (req, res, next) => {
  const { category } = req.params;
  if (!VALID_TYPES.includes(category)) return next(); // not a media category, let other routes handle it

  const { data, error } = await supabaseAdmin
    .from('media')
    .select(MEDIA_SELECT)
    .eq('media_type', category)
    .order('id', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /:category/:id
router.get('/:category/:id', async (req, res, next) => {
  const { category, id } = req.params;
  if (!VALID_TYPES.includes(category)) return next();

  const { data, error } = await supabaseAdmin
    .from('media')
    .select(MEDIA_SELECT)
    .eq('media_type', category)
    .eq('id', id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Media not found' });
  res.json(data);
});

// POST /media -- create (requires login)
router.post('/media', requireAuth, async (req, res) => {
  const { genre_ids, studio_ids, ...mediaFields } = req.body;

  if (!VALID_TYPES.includes(mediaFields.media_type)) {
    return res.status(400).json({ error: `media_type must be one of: ${VALID_TYPES.join(', ')}` });
  }

  const { data: created, error } = await supabaseAdmin
    .from('media')
    .insert(mediaFields)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Attach genres/studios if provided
  if (Array.isArray(genre_ids) && genre_ids.length) {
    await supabaseAdmin
      .from('media_genres')
      .insert(genre_ids.map((genre_id) => ({ media_id: created.id, genre_id })));
  }
  if (Array.isArray(studio_ids) && studio_ids.length) {
    await supabaseAdmin
      .from('media_studios')
      .insert(studio_ids.map((studio_id) => ({ media_id: created.id, studio_id, role: 'studio' })));
  }

  res.status(201).json(created);
});

// PUT /media/:id -- update (requires login)
router.put('/media/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('media')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Media not found' });
  res.json(data);
});

// DELETE /media/:id -- delete (requires login)
router.delete('/media/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('media')
    .delete()
    .eq('id', req.params.id)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Media not found' });
  res.json(data);
});

module.exports = router;
