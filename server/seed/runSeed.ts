import 'dotenv/config';
import { connectDatabase } from '../config/db.ts';
import { ensureSampleDataSeeded } from './sampleData.ts';

async function run() {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Seed] Demo/sample seeding is disabled in production (NODE_ENV=production).');
    console.error('[Seed] Run "npm run init-admin" to initialize a secure admin account manually.');
    process.exit(1);
  }
  await connectDatabase();
  await ensureSampleDataSeeded();
  console.log('[Seed] Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});
