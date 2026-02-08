/**
 * @fileoverview Network response code enumeration
 *
 * Defines success/error codes for API responses: 0 (Ok) and 1 (Error).
 */
// src/api/network/FNetCode.ts
/**
 * Represents network operation codes, typically used in API responses
 * to indicate the success or failure of a requested operation.
 */
export enum FNetCode {
  /** Indicates that the network operation was successful (Code: 0). */
  Ok = 0,
  /** Indicates that an error occurred during the network operation (Code: 1). */
  Error = 1,
}
