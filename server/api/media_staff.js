const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

// GET /media/:mediaId/staff -- everyone credited on this media, with role
router.get('/media/:mediaId/staff', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('media_staff')
    .select('role, staff_id, staff ( id, name, staff_type, image_url )')
    .eq('media_id', req.params.mediaId);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /media/:mediaId/staff  { staff_id, role }
router.post('/media/:mediaId/staff', requireAuth, async (req, res) => {
  const { staff_id, role } = req.body;
  if (!staff_id || !role) return res.status(400).json({ error: 'staff_id and role are required' });

  const { data, error } = await supabaseAdmin
    .from('media_staff')
    .insert({ media_id: req.params.mediaId, staff_id, role })
    .select('role, staff_id, staff ( id, name, staff_type, image_url )')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /media/:mediaId/staff/:staffId?role=director
router.delete('/media/:mediaId/staff/:staffId', requireAuth, async (req, res) => {
  const { role } = req.query;
  if (!role) return res.status(400).json({ error: 'role query param is required (part of the composite key)' });

  const { error } = await supabaseAdmin
    .from('media_staff')
    .delete()
    .eq('media_id', req.params.mediaId)
    .eq('staff_id', req.params.staffId)
    .eq('role', role);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;
