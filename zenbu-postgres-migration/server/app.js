// Entry point for the Zenbu backend. Postgres via Supabase (no more raw
// MongoDB connection string, no more localhost dependency).
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3069;

const mediaRoutes = require('./api/media.js');
const genresRoutes = require('./api/genres.js');
const studiosRoutes = require('./api/studios.js');
const charactersRoutes = require('./api/characters.js');
const staffRoutes = require('./api/staff.js');
const reviewsRoutes = require('./api/reviews.js');
const threadsRoutes = require('./api/threads.js');
const reactionsRoutes = require('./api/reactions.js');
const profilesRoutes = require('./api/profiles.js');

app.use(express.json());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : '*',
  })
);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/', staffRoutes);
app.use('/', charactersRoutes);
app.use('/', genresRoutes);
app.use('/', studiosRoutes);
app.use('/', reviewsRoutes);
app.use('/', threadsRoutes);
app.use('/', reactionsRoutes);
app.use('/', profilesRoutes);
app.use('/', mediaRoutes); // media routes last: it has the catch-all /:category routes

app.listen(port, () => {
  console.log(`Zenbu API running on port ${port}`);
});
