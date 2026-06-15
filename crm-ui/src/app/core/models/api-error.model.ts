/**
 * Structured error body returned by `GlobalExceptionHandler` for every 4xx/5xx
 * response (crm-service `exception/GlobalExceptionHandler.java`).
 */
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}
