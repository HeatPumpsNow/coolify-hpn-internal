// API Core utilities for Heat Pumps Now portal system

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, code?: string) {
    return new ApiError(400, message, code);
  }

  static unauthorized(message: string = 'Unauthorized', code?: string) {
    return new ApiError(401, message, code);
  }

  static forbidden(message: string = 'Forbidden', code?: string) {
    return new ApiError(403, message, code);
  }

  static notFound(message: string = 'Not found', code?: string) {
    return new ApiError(404, message, code);
  }

  static internal(message: string = 'Internal server error', code?: string) {
    return new ApiError(500, message, code);
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    status: number;
  };
}

export function createApiResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data
  };
}

export function createApiError(error: ApiError): ApiResponse {
  return {
    success: false,
    error: {
      message: error.message,
      code: error.code,
      status: error.status
    }
  };
}

export default {
  ApiError,
  createApiResponse,
  createApiError
};