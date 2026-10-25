import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { seedDatabase } from '../lib/seed';

async function main() {
  const force = process.argv.includes('--force');
  console.log(`Starting database seed (force=${force})...`);
  try {
    const result = await seedDatabase(force);
    console.log('Seed result:', result);
    process.exit(0);
  } catch (err) {
    console.error('Database seeding failed:', err);
    process.exit(1);
  }
}

main();
