/**
 * @fileoverview Interface defining the capabilities a TCP client must provide
 * to be used with GCodeController.
 *
 * Both FlashForgeClient and FlashForgeA3Client implement this interface.
 */

import type { TempInfo } from '../replays/TempInfo';

/**
 * Interface for TCP clients that can be used with GCodeController.
 *
 * This abstraction allows GCodeController to work with different printer clients
 * (FlashForgeClient for legacy printers, FlashForgeA3Client for Adventurer 3)
 * without being tightly coupled to a specific implementation.
 */
export interface GCodeClientCapabilities {
  /**
   * Sends a G-code command and checks for an "ok" response.
   * @param cmd The command string to send.
   * @returns A Promise that resolves to true if successful, false otherwise.
   */
  sendCmdOk(cmd: string): Promise<boolean>;

  /**
   * Gets current temperature information from the printer.
   * @returns A Promise that resolves to TempInfo or null if failed.
   */
  getTempInfo(): Promise<TempInfo | null>;
}
