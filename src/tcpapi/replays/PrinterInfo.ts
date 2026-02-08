/**
 * @fileoverview Parses M115 command responses to extract printer information including model, firmware, serial number, and dimensions.
 */
// src/tcpapi/replays/PrinterInfo.ts
/**
 * Represents general information about the FlashForge 3D printer,
 * such as its type, name, firmware version, serial number, dimensions, and MAC address.
 * This information is typically parsed from the response of an M115 G-code command,
 * which provides details about the printer's firmware and capabilities.
 */
export class PrinterInfo {
  /** The machine type or model name (e.g., "FlashForge Adventurer 5M Pro"). */
  public TypeName: string = '';
  /** The user-assigned name of the printer. */
  public Name: string = '';
  /** The firmware version currently installed on the printer. */
  public FirmwareVersion: string = '';
  /** The unique serial number of the printer. */
  public SerialNumber: string = '';
  /** The build dimensions of the printer (e.g., "X:220 Y:220 Z:220"). */
  public Dimensions: string = '';
  /** The MAC address of the printer's network interface. */
  public MacAddress: string = '';
  /** The number of tools (extruders) the printer has. Note: Marked as unused in FlashForge firmware by original code. */
  public ToolCount: string = '';

  /**
   * Parses a raw string replay (typically from an M115 command) to populate
   * the properties of this `PrinterInfo` instance.
   *
   * The M115 response is expected to be a multi-line string where each line
   * provides a piece of information in a "Key: Value" format.
   *
   * Parsing logic:
   * - Splits the replay by newline characters.
   * - Line 1 (data[0]): Usually command echo/header, often ignored or assumed specific format.
   * - Line 2 (data[1]): Expected to be "Machine Type: [TypeName]". `getRight` extracts the value.
   * - Line 3 (data[2]): Expected to be "Machine Name: [Name]". `getRight` extracts the value.
   * - Line 4 (data[3]): Expected to be "Firmware: [FirmwareVersion]". `getRight` extracts the value.
   * - Line 5 (data[4]): Expected to be "SN: [SerialNumber]". `getRight` extracts the value.
   * - Line 6 (data[5]): Expected to be the dimensions string directly (e.g., "X:220 Y:220 Z:220").
   * - Line 7 (data[6]): Expected to be "Tool count: [ToolCount]". `getRight` extracts the value.
   * - Line 8 (data[7]): Expected to be "Mac Address:[MacAddress]". The prefix is removed.
   *
   * The `getRight` helper function is used to extract the value part after the colon for several lines.
   *
   * @param replay The raw multi-line string response from the M115 command.
   * @returns The populated `PrinterInfo` instance, or null if parsing fails
   *          (e.g., due to unexpected format, null/empty replay, or missing critical data).
   */
  public fromReplay(replay: string): PrinterInfo | null {
    if (!replay) return null;

    try {
      const data = replay.split('\n');
      // Assumes data[0] is "CMD M115 Received." or similar header.

      const name = getRight(data[1]); // Expected: "Machine Type: Adventurer 5M Pro"
      if (name === null) {
        console.log('PrinterInfo replay has null Machine Type');
        return null;
      }
      this.TypeName = name;

      const nick = getRight(data[2]); // Expected: "Machine Name: MyPrinter"
      if (nick === null) {
        console.log('PrinterInfo replay has null Machine Name');
        return null;
      }
      this.Name = nick;

      const fw = getRight(data[3]); // Expected: "Firmware: V1.2.3"
      if (fw === null) {
        console.log('PrinterInfo replay has null firmware version');
        return null;
      }
      this.FirmwareVersion = fw;

      const sn = getRight(data[4]); // Expected: "SN: SN12345"
      if (sn === null) {
        console.log('PrinterInfo replay has null serial number');
        return null;
      }
      this.SerialNumber = sn;

      this.Dimensions = data[5].trim(); // Expected: "X:220 Y:220 Z:220" (or similar, directly)

      const tcs = getRight(data[6]); // Expected: "Tool count: 1"
      if (tcs === null) {
        console.log('PrinterInfo replay has null tool count');
        return null;
      }
      this.ToolCount = tcs;

      this.MacAddress = data[7].replace('Mac Address:', '').trim(); // Expected: "Mac Address: XX:XX:XX:XX:XX:XX"
      return this;
    } catch (_error) {
      console.log('Error creating PrinterInfo instance from replay');
      return null;
    }
  }

  /**
   * Returns a string representation of the printer information.
   * @returns A multi-line string detailing the printer's properties.
   */
  public toString(): string {
    return (
      'Printer Type: ' +
      this.TypeName +
      '\n' +
      'Name: ' +
      this.Name +
      '\n' +
      'Firmware: ' +
      this.FirmwareVersion +
      '\n' +
      'Serial Number: ' +
      this.SerialNumber +
      '\n' +
      'Print Dimensions: ' +
      this.Dimensions +
      '\n' +
      'Tool Count: ' +
      this.ToolCount +
      '\n' +
      'MAC Address: ' +
      this.MacAddress
    );
  }
}

/**
 * Helper function to extract the value part of a "Key: Value" string.
 * It splits the input string by the first colon and returns the trimmed value part.
 * @param rpData The input string (e.g., "Machine Type: Adventurer 5M Pro").
 * @returns The extracted value string (e.g., "Adventurer 5M Pro"), or null if parsing fails.
 * @private
 */
function getRight(rpData: string): string | null {
  try {
    return rpData.split(':')[1].trim();
  } catch {
    return null;
  }
}
