import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponse } from '../interfaces/response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: Record<string, any> | undefined;

    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse() as any;

      if (typeof errorResponse === 'object') {
        message = errorResponse.message || exception.message;
        code = this.getErrorCode(status);
      } else {
        message = errorResponse || exception.message;
        code = this.getErrorCode(status);
      }
    }
    // Handle validation errors
    else if (exception.response?.message && Array.isArray(exception.response.message)) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation error';
      code = 'VALIDATION_ERROR';
      details = {
        validationErrors: exception.response.message,
      };
    }
    // Handle Supabase/Database errors
    else if (exception.message?.includes('Failed to')) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      code = 'DATABASE_ERROR';
    }
    // Handle generic Error
    else if (exception instanceof Error) {
      message = exception.message || 'Something went wrong';
      code = 'UNKNOWN_ERROR';
    }

    // Log error
    this.logError(request, status, message, exception);

    // Build error response
    const errorResponse: ErrorResponse = {
      success: false,
      message,
      error: {
        code,
        details,
        timestamp: new Date().toISOString(),
      },
    };

    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: number): string {
    const codeMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
    };
    return codeMap[status] || 'UNKNOWN_ERROR';
  }

  private logError(request: any, status: number, message: string, exception: any): void {
    const logData = {
      method: request.method,
      path: request.path,
      status,
      message,
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      this.logger.error(JSON.stringify(logData), exception.stack);
    } else {
      this.logger.warn(JSON.stringify(logData));
    }
  }
}
