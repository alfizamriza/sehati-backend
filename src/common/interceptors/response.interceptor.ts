import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/response.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  private readonly logger = new Logger('ResponseInterceptor');

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      map((data) => {
        const elapsedTime = Date.now() - startTime;

        // If data is already in ApiResponse format, return as is
        if (
          data &&
          typeof data === 'object' &&
          'success' in data
        ) {
          const existing = data as Partial<ApiResponse<T>> & { success: boolean };
          return {
            success: existing.success,
            message: existing.message || this.getDefaultMessage(request.method),
            data: existing.data !== undefined ? (existing.data as T) : undefined,
            timestamp: existing.timestamp || new Date().toISOString(),
            path: existing.path || request.path,
          };
        }

        // Build standardized response
        const response: ApiResponse<T> = {
          success: true,
          message: this.getDefaultMessage(request.method),
          data: data !== undefined ? (data as T) : undefined,
          timestamp: new Date().toISOString(),
          path: request.path,
        };

        // Log successful requests
        this.logger.debug(
          `${request.method} ${request.path} - ${elapsedTime}ms`,
        );

        return response;
      }),
    );
  }

  private getDefaultMessage(method: string): string {
    const messages: Record<string, string> = {
      GET: 'Data retrieved successfully',
      POST: 'Data created successfully',
      PUT: 'Data updated successfully',
      PATCH: 'Data updated successfully',
      DELETE: 'Data deleted successfully',
    };
    return messages[method] || 'Request successful';
  }
}
