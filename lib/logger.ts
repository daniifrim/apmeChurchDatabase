export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  context?: Record<string, any>;
  requestId?: string;
  userId?: string;
}

class Logger {
  private static instance: Logger;
  private isDev = process.env.NODE_ENV !== 'production';

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatLog(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  }

  private log(level: LogEntry['level'], message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    const formatted = this.formatLog(entry);

    if (this.isDev) {
      // In development, use console for better readability
      console[level](`[${level.toUpperCase()}] ${message}`, context || '');
    } else {
      // In production, use structured logging
      console.log(formatted);
    }
  }

  error(message: string, error?: Error | Record<string, any>) {
    this.log('error', message, error instanceof Error ? { error: error.message, stack: error.stack } : error);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  debug(message: string, context?: Record<string, any>) {
    if (this.isDev) {
      this.log('debug', message, context);
    }
  }
}

export const logger = Logger.getInstance();

// Request logging utility for serverless functions
export function logRequest(req: {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}) {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    requestId,
    userAgent: req.headers?.['user-agent'],
    ip: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress,
  });

  return requestId;
}

// Error logging utility for serverless functions
export function logError(error: Error, req?: {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}, context?: Record<string, any>) {
  const logData: Record<string, any> = {
    error: error.message,
    stack: error.stack,
    ...context,
  };

  if (req) {
    logData.method = req.method;
    logData.url = req.url;
    logData.userAgent = req.headers?.['user-agent'];
    logData.ip = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress;
  }

  logger.error('Serverless function error', logData);
}
