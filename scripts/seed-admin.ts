import { auth } from '../api/_lib/auth.js';
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  const existing = await sql`SELECT id FROM "user" WHERE email = 'admin@lumenalta.com'`;
  if (existing.length) {
    await sql`DELETE FROM account WHERE user_id = ${existing[0].id}`;
    await sql`DELETE FROM "user" WHERE id = ${existing[0].id}`;
    console.log('Cleared existing record');
  }

  const response = await auth.api.signUpEmail({
    body: { email: 'admin@lumenalta.com', password: 'Admin1234!', name: 'Admin' },
  });
  console.log('Created user:', response?.user?.id);

  await sql`UPDATE "user" SET role = 'admin' WHERE email = 'admin@lumenalta.com'`;
  const users = await sql`SELECT id, email, role FROM "user" WHERE email = 'admin@lumenalta.com'`;
  console.log('✓ Admin seeded:', JSON.stringify(users[0]));
}

main().catch(console.error);
