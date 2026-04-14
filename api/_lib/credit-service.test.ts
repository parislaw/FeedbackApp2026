// Tests for credit-service: getBalance, addCredits, initializeCredits
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { db as productionDb, user, credits } from './db.js';
import { getBalance, addCredits, initializeCredits } from './credit-service.js';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// Use production DB connection for integration tests
const db = productionDb;

// Test helpers
const testUserIds: string[] = [];

async function createTestUser(userId: string): Promise<void> {
  try {
    await db.insert(user).values({
      id: userId,
      name: 'Test User',
      email: `test-${userId}@example.com`,
      emailVerified: false,
      role: 'user',
    });
    testUserIds.push(userId);
  } catch (error) {
    // User might already exist
  }
}

async function cleanupTestUsers(): Promise<void> {
  for (const userId of testUserIds) {
    try {
      // Cascade delete via FK will remove credits
      await db.delete(user).where(eq(user.id, userId));
    } catch (error) {
      console.error(`Failed to cleanup user ${userId}:`, error);
    }
  }
  testUserIds.length = 0;
}

describe('Credit Service', () => {
  afterEach(async () => {
    await cleanupTestUsers();
  });

  // ────────────────────────────────────────────────────────────────────────
  // getBalance Tests
  // ────────────────────────────────────────────────────────────────────────

  describe('getBalance', () => {
    it('returns 0 for unknown user (no credits row)', async () => {
      const unknownUserId = 'unknown-user-' + Date.now();
      const balance = await getBalance(unknownUserId);
      expect(balance).toBe(0);
    });

    it('returns correct balance after initializeCredits', async () => {
      const userId = 'test-user-' + Date.now();
      await createTestUser(userId);
      await initializeCredits(userId, 5);
      const balance = await getBalance(userId);
      expect(balance).toBe(5);
    });

    it('returns correct balance after addCredits', async () => {
      const userId = 'test-user-add-' + Date.now();
      await createTestUser(userId);
      await initializeCredits(userId, 10);
      await addCredits(userId, 5);
      const balance = await getBalance(userId);
      expect(balance).toBe(15);
    });

    it('returns 0 when credits row exists but balance is 0', async () => {
      const userId = 'test-user-zero-' + Date.now();
      await createTestUser(userId);
      await initializeCredits(userId, 0);
      const balance = await getBalance(userId);
      expect(balance).toBe(0);
    });

    it('returns negative balance if set directly', async () => {
      const userId = 'test-user-neg-' + Date.now();
      await createTestUser(userId);
      // Direct insert with negative balance (edge case)
      await db.insert(credits).values({ userId, balance: -5 }).onConflictDoNothing();
      const balance = await getBalance(userId);
      expect(balance).toBe(-5);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // initializeCredits Tests
  // ────────────────────────────────────────────────────────────────────────

  describe('initializeCredits', () => {
    it('creates credits row with default balance of 3', async () => {
      const userId = 'test-user-init-default-' + Date.now();
      await createTestUser(userId);
      await initializeCredits(userId);
      const balance = await getBalance(userId);
      expect(balance).toBe(3);
    });

    it('creates credits row with custom balance', async () => {
      const userId = 'test-user-init-custom-' + Date.now();
      await createTestUser(userId);
      await initializeCredits(userId, 25);
      const balance = await getBalance(userId);
      expect(balance).toBe(25);
    });

    it('is idempotent — duplicate call does not change balance', async () => {
      const userId = 'test-user-idem-' + Date.now();
      await createTestUser(userId);
      await initializeCredits(userId, 10);
      const balance1 = await getBalance(userId);

      // Call again with different balance — should not change due to onConflictDoNothing
      await initializeCredits(userId, 50);
      const balance2 = await getBalance(userId);

      expect(balance1).toBe(10);
      expect(balance2).toBe(10); // Unchanged
    });

    it('is idempotent — no error on duplicate init', async () => {
      const userId = 'test-user-idem-no-error-' + Date.now();
      await createTestUser(userId);

      // Should not throw
      await expect(initializeCredits(userId, 7)).resolves.not.toThrow();
      await expect(initializeCredits(userId, 7)).resolves.not.toThrow();

      const balance = await getBalance(userId);
      expect(balance).toBe(7);
    });

    it('works with zero balance', async () => {
      const userId = 'test-user-zero-init-' + Date.now();
      await createTestUser(userId);
      await initializeCredits(userId, 0);
      const balance = await getBalance(userId);
      expect(balance).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // addCredits Tests
  // ────────────────────────────────────────────────────────────────────────

  describe('addCredits', () => {
    it('increases balance by exact amount', async () => {
      const userId = 'test-user-add-exact-' + Date.now();
      await createTestUser(userId);
      await initializeCredits(userId, 10);
      const newBalance = await addCredits(userId, 5);
      expect(newBalance).toBe(15);
    });

    it('returns updated balance', async () => {
      const userId = 'test-user-add-return-' + Date.now();
      await createTestUser(userId);
      await initializeCredits(userId, 20);
      const balance = await addCredits(userId, 8);
      expect(balance).toBe(28);
    });

    it('creates credits row if it does not exist', async () => {
      const userId = 'test-user-add-new-' + Date.now();
      await createTestUser(userId);
      // Do NOT initialize — credits row should not exist yet
      const balance1 = await getBalance(userId);
      expect(balance1).toBe(0); // Returns 0 for unknown

      // addCredits should create row
      const newBalance = await addCredits(userId, 5);
      expect(newBalance).toBe(5);

      // Verify it persists
      const balance2 = await getBalance(userId);
      expect(balance2).toBe(5);
    });

    it('adds negative amount (deducts credits)', async () => {
      const userId = 'test-user-add-neg-' + Date.now();
      await createTestUser(userId);
      await initializeCredits(userId, 20);
      const newBalance = await addCredits(userId, -5);
      expect(newBalance).toBe(15);
    });

    it('handles zero addition', async () => {
      const userId = 'test-user-add-zero-' + Date.now();
      await createTestUser(userId);
      await initializeCredits(userId, 10);
      const newBalance = await addCredits(userId, 0);
      expect(newBalance).toBe(10);
    });

    it('is atomic — multiple concurrent adds aggregate correctly', async () => {
      const userId = 'test-user-atomic-' + Date.now();
      await createTestUser(userId);
      await initializeCredits(userId, 0);

      // Simulate concurrent adds
      const results = await Promise.all([
        addCredits(userId, 10),
        addCredits(userId, 15),
        addCredits(userId, 5),
      ]);

      // Final balance should be sum of all adds
      const finalBalance = await getBalance(userId);
      expect(finalBalance).toBe(30);

      // Each result should reflect the balance after its operation
      expect(results.length).toBe(3);
      expect(results).toContainEqual(10); // First add
      expect(results).toContainEqual(25); // Second add
      expect(results).toContainEqual(30); // Third add
    });

    it('can overdraw (no validation of balance)', async () => {
      const userId = 'test-user-overdraw-' + Date.now();
      await createTestUser(userId);
      await initializeCredits(userId, 5);
      const newBalance = await addCredits(userId, -10);
      expect(newBalance).toBe(-5); // Negative balance allowed
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Integration Tests
  // ────────────────────────────────────────────────────────────────────────

  describe('Credit lifecycle', () => {
    it('supports full lifecycle: init → check → add → check', async () => {
      const userId = 'test-user-lifecycle-' + Date.now();
      await createTestUser(userId);

      // Initialize
      await initializeCredits(userId, 3);
      expect(await getBalance(userId)).toBe(3);

      // Add credits
      await addCredits(userId, 2);
      expect(await getBalance(userId)).toBe(5);

      // Add more
      await addCredits(userId, 1);
      expect(await getBalance(userId)).toBe(6);

      // Deduct
      await addCredits(userId, -4);
      expect(await getBalance(userId)).toBe(2);
    });

    it('handles user deletion cascade (credits deleted with user)', async () => {
      const userId = 'test-user-cascade-' + Date.now();
      await createTestUser(userId);
      await initializeCredits(userId, 10);

      // Verify credits exist
      expect(await getBalance(userId)).toBe(10);

      // Delete user (manual cleanup in test)
      await db.delete(user).where(eq(user.id, userId));

      // Credits should be gone (cascade delete)
      // But getBalance returns 0 for missing rows
      expect(await getBalance(userId)).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Edge Cases & Error Handling
  // ────────────────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles very large balance values', async () => {
      const userId = 'test-user-large-' + Date.now();
      await createTestUser(userId);
      const largeAmount = 999999999;
      await initializeCredits(userId, largeAmount);
      expect(await getBalance(userId)).toBe(largeAmount);
    });

    it('handles multiple users independently', async () => {
      const user1 = 'test-user-1-' + Date.now();
      const user2 = 'test-user-2-' + Date.now();
      await createTestUser(user1);
      await createTestUser(user2);

      await initializeCredits(user1, 10);
      await initializeCredits(user2, 20);

      await addCredits(user1, 5);
      // Don't modify user2

      expect(await getBalance(user1)).toBe(15);
      expect(await getBalance(user2)).toBe(20); // Unchanged
    });

    it('handles userId with special characters', async () => {
      const userId = 'test-user-special-' + Date.now() + '-abc@123';
      await createTestUser(userId);
      await initializeCredits(userId, 7);
      expect(await getBalance(userId)).toBe(7);
    });
  });
});
