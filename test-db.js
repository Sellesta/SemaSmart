require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql('select 1 as ok')
  .then(r => console.log('CONNECTED:', r))
  .catch(e => { console.log('ERROR:', e.message); console.log('CAUSE:', e.cause || e.sourceError); });
