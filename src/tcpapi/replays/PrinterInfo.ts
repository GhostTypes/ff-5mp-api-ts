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
   * - Splits the replay by newline characters, trims each line, and filters out blank lines.
   * - Iterates through lines matching known prefixes (Machine Type, Machine Name, Firmware, etc.).
   * - This approach is resilient to blank lines, extra whitespace, and minor formatting variations
   *   across different printer firmware versions (e.g., Adventurer 3C Pro inserts a blank line
   *   between Machine Name and Firmware).
   *
   * @param replay The raw multi-line string response from the M115 command.
   * @returns The populated `PrinterInfo` instance, or null if parsing fails
   *          (e.g., due to unexpected format, null/empty replay, or missing critical data).
   */
  public fromReplay(replay: string): PrinterInfo | null {
    if (!replay) return null;

    try {
      const lines = replay
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && line !== 'ok');

      for (const line of lines) {
        if (line.startsWith('Machine Type:')) {
          this.TypeName = line.replace('Machine Type:', '').trim();
        } else if (line.startsWith('Machine Name:')) {
          this.Name = line.replace('Machine Name:', '').trim();
        } else if (line.startsWith('Firmware:')) {
          this.FirmwareVersion = line.replace('Firmware:', '').trim();
        } else if (line.startsWith('SN:') || line.startsWith('Serial Number:')) {
          this.SerialNumber = line.replace(/^(SN|Serial Number):/, '').trim();
        } else if (line.startsWith('Tool Count:') || line.startsWith('Tool count:')) {
          this.ToolCount = line.split(':')[1]?.trim() ?? '';
        } else if (line.startsWith('Mac Address:')) {
          this.MacAddress = line.replace('Mac Address:', '').trim();
        } else {
          const volumeMatch = line.match(/X:\s*\d+\s+Y:\s*\d+\s+Z:\s*\d+/i);
          if (volumeMatch) {
            this.Dimensions = line;
          }
        }
      }

      if (!this.TypeName) {
        console.log('PrinterInfo replay has null Machine Type');
        return null;
      }
      if (!this.FirmwareVersion) {
        console.log('PrinterInfo replay has null firmware version');
        return null;
      }

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

