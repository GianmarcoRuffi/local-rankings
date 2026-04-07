type LogLevel = "error" | "warn" | "info" | "debug";

interface LogContext {
  [key: string]: unknown;
}

interface Logger {
  error: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  debug: (message: string, context?: LogContext) => void;
}

function formatLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (context && Object.keys(context).length > 0) {
    return `${base} ${JSON.stringify(context)}`;
  }

  return base;
}

function shouldLog(level: LogLevel): boolean {
  if (process.env.NODE_ENV === "test") {
    return false;
  }

  const envLevel = process.env.LOG_LEVEL?.toLowerCase() || "info";
  const levels: LogLevel[] = ["error", "warn", "info", "debug"];
  const currentLevelIndex = levels.indexOf(envLevel as LogLevel);
  const messageLevelIndex = levels.indexOf(level);

  return messageLevelIndex <= currentLevelIndex;
}

export const logger: Logger = {
  error: (message: string, context?: LogContext) => {
    if (shouldLog("error")) {
      console.error(formatLog("error", message, context));
    }
  },

  warn: (message: string, context?: LogContext) => {
    if (shouldLog("warn")) {
      console.warn(formatLog("warn", message, context));
    }
  },

  info: (message: string, context?: LogContext) => {
    if (shouldLog("info")) {
      console.log(formatLog("info", message, context));
    }
  },

  debug: (message: string, context?: LogContext) => {
    if (shouldLog("debug")) {
      console.log(formatLog("debug", message, context));
    }
  },
};
