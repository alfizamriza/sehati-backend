import { Injectable, LoggerService } from '@nestjs/common';

type LogLevel = 'error' | 'warn' | 'log' | 'debug' | 'verbose';

interface LogContext {
  context?: string;
  method?: string;
  data?: any;
}

@Injectable()
export class AppLogger implements LoggerService {
  private context = 'App';

  setContext(context: string) {
    this.context = context;
  }

  error(message: string, trace?: string, context?: LogContext) {
    this.log('error', message, { trace, ...context });
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  logMessage(message: string, context?: LogContext) {
    this.log('log', message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  verbose(message: string, context?: LogContext) {
    this.log('verbose', message, context);
  }

  log(level: LogLevel | string, message: string, context?: any) {
    const timestamp = new Date().toISOString();
    const contextStr = context?.context || this.context;
    const method = context?.method ? ` [${context.method}]` : '';
    
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${contextStr}]${method} ${message}`;

    if (context?.data) {
      console[level](logMessage, context.data);
    } else {
      console[level](logMessage);
    }

    // In production, you could send logs to external service
    // e.g., Sentry, DataDog, etc.
  }
}
