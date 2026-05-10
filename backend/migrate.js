const db = require('./config/db');

async function migrate() {
  try {
    await db.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS subject TEXT;');
    console.log('Migration successful: added subject column to messages table');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
