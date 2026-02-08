/**
 * @fileoverview Type-safe error handling utilities
 */

import type { GenericResponse } from '../api/controls/Control';

/**
 * Type guard for errors with cause property (ES2022)
 * @param error - The error to check
 * @returns True if the error has a cause property
 */
export function isErrorWithCause(error: Error): error is Error & { cause: unknown } {
  return 'cause' in error;
}

/**
 * Type guard for Axios errors with response data
 * @param error - The error to check
 * @returns True if the error is an AxiosError with a response
 */
export function isAxiosErrorWithResponse<T = unknown>(
  error: unknown
): error is {
  isAxiosError: boolean;
  response: T;
  config: { url?: string };
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as { isAxiosError: boolean }).isAxiosError === true &&
    'response' in error
  );
}

/**
 * Type guard for GenericResponse validation
 * @param data - The data to validate
 * @returns True if the data matches GenericResponse structure
 */
export function isGenericResponse(data: unknown): data is GenericResponse {
  return typeof data === 'object' && data !== null && 'code' in data && 'message' in data;
}
