// Placeholder auth-refactored utility - redirects to new Supabase auth
import { getAuthenticatedUser } from '@/lib/supabase/server';

export async function validateRefreshToken(token: string) {
  // This function is deprecated - use Supabase auth instead
  throw new Error('This auth method is deprecated. Use Supabase authentication.');
}

export async function refreshUserSession(userId: string) {
  // This function is deprecated - use Supabase auth instead
  return await getAuthenticatedUser();
}

export default {
  validateRefreshToken,
  refreshUserSession
};