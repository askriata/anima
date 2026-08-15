const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const CHARACTER_SELECT = `
  *,
  character_voice_actors ( role, staff ( id, name, image_url ) ),
  media_characters ( role, media ( id, name, media_type ) )
`;

router.get('/characters', async (req, res) => {
  const { media_id } = req.query;

  if (media_id) {
    // Characters linked to this media via the join table -- covers
    // characters shared across seasons/parts, not just ones originally
    // created against this exact media_id.
    const { data, error } = await supabaseAdmin
      .from('media_characters')
      .select(`role, characters ( ${CHARACTER_SELECT} )`)
      .eq('media_id', media_id);

    if (error) return res.status(500).json({ error: error.message });
    // Flatten so the response shape matches the no-filter case below.
    return res.json(data.map((row) => ({ ...row.characters, role: row.role })));
  }

  const { data, error } = await supabaseAdmin.from('characters').select(CHARACTER_SELECT).order('id');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /characters/search  { name: "..." }
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

// POST /characters  { media_id, name, ..., voice_actor_ids?, also_appears_in? }
// `media_id` stays required -- it's the character's "home" entry, same as
// before. `also_appears_in` is new: an optional array of other media_ids
// (e.g. later seasons) to link immediately via media_characters.
router.post('/characters', requireAuth, async (req, res) => {
  const { voice_actor_ids, also_appears_in, ...fields } = req.body;

  const { data: created, error } = await supabaseAdmin
    .from('characters')
    .insert(fields)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  // Always link the character's home media_id into the join table too, so
  // GET /characters?media_id=... (above) finds it consistently either way.
  const links = [{ media_id: created.media_id, character_id: created.id, role: created.role }];
  if (Array.isArray(also_appears_in)) {
    for (const media_id of also_appears_in) {
      links.push({ media_id, character_id: created.id, role: created.role });
    }
  }
  await supabaseAdmin.from('media_characters').upsert(links, { onConflict: 'media_id,character_id' });

  if (Array.isArray(voice_actor_ids) && voice_actor_ids.length) {
    await supabaseAdmin.from('character_voice_actors').insert(
      voice_actor_ids.map((staff_id) => ({ character_id: created.id, staff_id }))
    );
  }

  res.status(201).json(created);
});

// POST /characters/:id/link  { media_id, role? } -- link an existing
// character (e.g. a franchise protagonist) to another media row, like a
// new season, without duplicating their character record.
router.post('/characters/:id/link', requireAuth, async (req, res) => {
  const { media_id, role } = req.body;
  if (!media_id) return res.status(400).json({ error: 'media_id is required' });

  const { data, error } = await supabaseAdmin
    .from('media_characters')
    .upsert({ media_id, character_id: req.params.id, role }, { onConflict: 'media_id,character_id' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

module.exports = router;
