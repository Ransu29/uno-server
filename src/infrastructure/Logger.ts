/**
 * src/infrastructure/Logger.ts
 * 
 * A structured logging utility.
 * Outputs logs in JSON format for easy parsing by monitoring tools.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string; // e.g., 'SocketHandler', 'GameEngine'
  meta?: Record<string, any>; // structured data (roomId, playerId, etc.)
}

export class Logger {
  private static log(level: LogLevel, message: string, context?: string, meta?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      meta,
    };
    
    // In production, this might stream to a file or external service.
    // For now, stdout/stderr is the 12-factor app standard.
    if (level === 'ERROR') {
      console.error(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  static info(message: string, context?: string, meta?: any) {
    this.log('INFO', message, context, meta);
  }

  static warn(message: string, context?: string, meta?: any) {
    this.log('WARN', message, context, meta);
  }

  static error(message: string, context?: string, error?: any) {
    // If error is an Error object, pull out stack and message
    const meta = error instanceof Error 
      ? { errorMessage: error.message, stack: error.stack }
      : error;
      
    this.log('ERROR', message, context, meta);
  }
}