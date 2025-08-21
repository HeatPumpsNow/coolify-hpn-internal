// Main exports for the API package
export * from './api-client';
export { handleLogin, handleLogout, handleVerify } from './auth-handler';
export { AuthService } from '../services/auth.service';
export type { User, AuthCredentials, AuthResponse } from '../services/auth.service';