const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const STUDIO_SELECT = `
  *,
  studio_employees ( role, staff ( id, name, staff_type ) )
`;

router.get('/studios', async (req, res) => {
  const { data, error } = await supabaseAdmin.from('studios').select(STUDIO_SELECT).order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/studios/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('studios')
    .select(STUDIO_SELECT)
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Studio not found' });
  res.json(data);
});

router.post('/studios', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('studios').insert(req.body).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// POST /studios/:id/employees  { staff_id, role }
router.post('/studios/:id/employees', requireAuth, async (req, res) => {
  const { staff_id, role } = req.body;
  if (!staff_id) return res.status(400).json({ error: 'staff_id is required' });

  const { data, error } = await supabaseAdmin
    .from('studio_employees')
    .insert({ studio_id: req.params.id, staff_id, role })
    .select('role, staff ( id, name, staff_type )')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /studios/:id/employees/:staffId
router.delete('/studios/:id/employees/:staffId', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('studio_employees')
    .delete()
    .eq('studio_id', req.params.id)
    .eq('staff_id', req.params.staffId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;
