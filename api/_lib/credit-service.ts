// Credit service — getBalance, addCredits, initializeCredits
import { db, credits } from './db.js';
import { eq, sql } from 'drizzle-orm';

export async function getBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({ balance: credits.balance })
    .from(credits)
    .where(eq(credits.userId, userId));
  return row?.balance ?? 0;
}

export async function addCredits(userId: string, amount: number): Promise<number> {
  const [row] = await db
    .insert(credits)
    .values({ userId, balance: amount })
    .onConflictDoUpdate({
      target: credits.userId,
      set: { balance: sql`${credits.balance} + ${amount}`, updatedAt: new Date() },
    })
    .returning({ balance: credits.balance });
  return row.balance;
}

export async function initializeCredits(userId: string, initialBalance: number = 3): Promise<void> {
  await db
    .insert(credits)
    .values({ userId, balance: initialBalance })
    .onConflictDoNothing();
}
