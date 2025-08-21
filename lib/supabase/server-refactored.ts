// Refactored server authentication utilities
import { requireAuth, getAuthenticatedUser } from './server';

export class EmployeeAuthService {
  static async validateRefreshToken(token: string) {
    // This method is deprecated - use Supabase built-in refresh
    throw new Error('Use Supabase built-in token refresh instead');
  }

  static async refreshSession(refreshToken: string) {
    // This method is deprecated - use Supabase built-in refresh
    throw new Error('Use Supabase built-in session refresh instead');
  }

  static async validateSession(token: string) {
    // Use the new authentication system
    return await getAuthenticatedUser();
  }
}

export default EmployeeAuthService;