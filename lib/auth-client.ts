// Better Auth client instance — used across all React components for session/auth state
import { createAuthClient } from 'better-auth/client';
import { adminClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined'
    ? window.location.origin
    : (import.meta.env.VITE_APP_URL || 'http://localhost:3000'),
  plugins: [adminClient()],
});
