/**
 * Standardized API Response Format
 * Used across all endpoints to ensure consistent response structure
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
  timestamp?: string;
  path?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  message: string;
  data: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  timestamp?: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details?: Record<string, any>;
    timestamp: string;
  };
}
