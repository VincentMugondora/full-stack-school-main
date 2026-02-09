import fs from 'fs';
import path from 'path';
import { clerkClient } from '@clerk/nextjs/server';

const username = process.env.USERNAME || 'testuser';
const password = process.env.PASSWORD || 'TestPass123';
const role = process.env.ROLE || 'admin';

function loadDotenvIfMissing() {
  if (process.env.CLERK_SECRET_KEY) return;
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
    if (!m) continue;
    const [, key, rawVal] = m;
    const val = rawVal.trim().replace(/^"|"$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

(async () => {
  loadDotenvIfMissing();

  if (!process.env.CLERK_SECRET_KEY) {
    console.error('CLERK_SECRET_KEY not set in environment or .env');
    process.exit(1);
  }

  try {
    const user = await clerkClient.users.createUser({
      username,
      password,
      firstName: 'Test',
      lastName: 'User',
      publicMetadata: { role },
    });

    console.log('Created Clerk user:');
    console.log('  id:', user.id);
    console.log('  username:', user.username);
    console.log('  role:', role);
  } catch (err) {
    console.error('Error creating user:', err);
    process.exit(1);
  }
})();
