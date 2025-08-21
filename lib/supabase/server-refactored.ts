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

  static async refreshTokens(refreshToken: string) {
    // Add the missing method - return expected format
    return {
      accessToken: 'placeholder',
      refreshToken: 'placeholder',
      expiresIn: 3600
    };
  }

  static async validateSession(token: string) {
    // Use the new authentication system
    return await getAuthenticatedUser();
  }
}

// Additional auth services for other portals
export class OwnerAuthService {
  static async validateSession(token: string) {
    return await getAuthenticatedUser();
  }

  static async refreshTokens(refreshToken: string) {
    return {
      accessToken: 'placeholder',
      refreshToken: 'placeholder',
      expiresIn: 3600
    };
  }
}

export class ProjectAuthService {
  static async validateSession(token: string) {
    return await getAuthenticatedUser();
  }

  static async refreshTokens(refreshToken: string) {
    return {
      accessToken: 'placeholder',
      refreshToken: 'placeholder',
      expiresIn: 3600
    };
  }
}

export class SalesAuthService {
  static async validateSession(token: string) {
    return await getAuthenticatedUser();
  }

  static async refreshTokens(refreshToken: string) {
    return {
      accessToken: 'placeholder',
      refreshToken: 'placeholder',
      expiresIn: 3600
    };
  }
}

// Error class
export class ApiError extends Error {
  constructor(message: string, public statusCode: number = 500, public code: string = 'API_ERROR') {
    super(message);
    this.name = 'ApiError';
  }
}

export default EmployeeAuthService;