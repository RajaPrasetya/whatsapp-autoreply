/**
 * Get current time formatted with Asia/Singapore timezone
 */
export function getCurrentTimestamp(): string {
  return new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Log with timestamp in Asia/Singapore timezone
 */
export function logWithTimestamp(message: string, ...args: any[]): void {
  const timestamp = getCurrentTimestamp();
  console.log(`[${timestamp} SGT]`, message, ...args);
}

/**
 * Log error with timestamp in Asia/Singapore timezone
 */
export function logErrorWithTimestamp(message: string, ...args: any[]): void {
  const timestamp = getCurrentTimestamp();
  console.error(`[${timestamp} SGT]`, message, ...args);
}
