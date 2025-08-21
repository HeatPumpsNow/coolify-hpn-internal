// Removed authService import as it creates circular dependency
// API client should not depend on auth service directly

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retry?: number;
  requireAuth?: boolean;
}

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(message: string, code: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Centralized API Client
 * Provides consistent API communication across all portals
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private authToken?: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = undefined;
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(endpoint, this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Execute fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      let error: any = {
        code: 'API_ERROR',
        message: `Request failed with status ${response.status}`
      };

      if (isJson) {
        try {
          const errorData = await response.json();
          error = errorData.error || errorData;
        } catch {
          // Keep default error
        }
      }

      throw new ApiError(
        error.message || error.msg || 'Request failed',
        error.code || 'API_ERROR',
        response.status,
        error.details
      );
    }

    if (isJson) {
      const data = await response.json();
      
      // Handle different response formats
      if (data.success !== undefined) {
        return data as ApiResponse<T>;
      }
      
      // Wrap non-standard responses
      return {
        success: true,
        data: data as T,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: response.headers.get('x-request-id') || ''
        }
      };
    }

    return {
      success: true,
      data: null as any,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: response.headers.get('x-request-id') || ''
      }
    };
  }

  /**
   * Make API request
   */
  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      params,
      timeout = 30000,
      retry = 0,
      requireAuth = false,
      headers = {},
      ...fetchOptions
    } = options;

    const url = this.buildUrl(endpoint, params);

    // Ensure headers are in the correct format
    const headerObj: Record<string, string> = { ...this.defaultHeaders };
    
    // Merge additional headers if provided
    if (headers) {
      if (headers instanceof Headers) {
        headers.forEach((value, key) => {
          headerObj[key] = value;
        });
      } else if (Array.isArray(headers)) {
        headers.forEach(([key, value]) => {
          headerObj[key] = value;
        });
      } else {
        Object.assign(headerObj, headers);
      }
    }
    
    const requestHeaders = headerObj;

    if (requireAuth || this.authToken) {
      if (!this.authToken) {
        throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401);
      }
      requestHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    const makeRequest = async (attempt: number): Promise<ApiResponse<T>> => {
      try {
        const response = await this.fetchWithTimeout(
          url,
          {
            ...fetchOptions,
            headers: requestHeaders
          },
          timeout
        );

        return await this.handleResponse<T>(response);
      } catch (error) {
        if (attempt < retry) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return makeRequest(attempt + 1);
        }
        throw error;
      }
    };

    return makeRequest(0);
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET'
    });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE'
    });
  }

  /**
   * Upload file
   */
  async upload<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const { headers = {}, ...restOptions } = options || {};
    
    // Remove Content-Type to let browser set it with boundary
    const { 'Content-Type': _, ...restHeaders } = headers as Record<string, string>;

    return this.request<T>(endpoint, {
      ...restOptions,
      method: 'POST',
      headers: restHeaders,
      body: formData as any
    });
  }
}

// Create portal-specific API clients
export const createApiClient = (baseUrl: string): ApiClient => {
  return new ApiClient(baseUrl);
};

// Export pre-configured clients for each portal
export const employeeApi = createApiClient('/api/employee');
export const ownerApi = createApiClient('/api/owner');
export const customerApi = createApiClient('/api/customer');
export const salesApi = createApiClient('/api/sales');
export const serviceApi = createApiClient('/api/service');