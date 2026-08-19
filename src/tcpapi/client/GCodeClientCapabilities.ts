/**
 * @fileoverview Interface defining the capabilities a TCP client must provide
 * to be used with GCodeController.
 *
 * FlashForgeA4Client is the only class that declares `implements GCodeClientCapabilities`.
 * FlashForgeClient and FlashForgeA3Client satisfy the same shape without declaring it:
 * FlashForgeClient passes itself to `new GCodeController(this)`, and the Adventurer 3
 * side uses its own A3GCodeController (a `GCodeController<FlashForgeA3Client>` subclass).
 */

import type { TempInfo } from '../replays/TempInfo';

/**
 * Interface for TCP clients that can be used with GCodeController.
 *
 * This abstraction allows GCodeController to work with different printer clients
 * without being tightly coupled to a specific implementation. FlashForgeA4Client
 * declares it directly. FlashForgeClient and FlashForgeA3Client conform to it
 * structurally: both define `sendCmdOk` and `getTempInfo`, which is what the
 * GCodeController generic constraint requires.
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
