// Owner-specific server utilities
import { requireAuth, getAuthenticatedUser } from './server';

export class OwnerAuthService {
  static async validateOwnerAccess(userId: string) {
    const { user, error } = await requireAuth(['owner']);
    return { user, error };
  }

  static async getOwnerProfile(userId: string) {
    const { user, error } = await requireAuth(['owner']);
    return { user, error };
  }
}

export default OwnerAuthService;