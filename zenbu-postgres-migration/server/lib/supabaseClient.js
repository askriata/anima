// This file is the equivalent of the old mongoose.connect() call in app.js,
// except Supabase's client doesn't hold a persistent TCP connection the
// way Mongoose does -- every call is a normal HTTPS request. That's what
// makes this backend portable to serverless/edge platforms later, not
// just a long-running server like Render.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill it in.'
  );
}

// Service-role client: used by all the route handlers below. It has full
// access to the database (bypasses row-level security), which is fine
// because this code runs on your server, never in a browser.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

module.exports = { supabaseAdmin };
