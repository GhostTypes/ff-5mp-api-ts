/**
 * @fileoverview Parses M114 command responses to extract current print head X, Y, Z coordinates.
 */
// src/tcpapi/replays/LocationInfo.ts
/**
 * Represents the current X, Y, and Z coordinates of the printer's print head.
 * This information is typically parsed from the response of an M114 G-code command,
 * which reports the current position.
 */
export class LocationInfo {
  /** The current X-axis coordinate as a string (e.g., "10.00"). */
  public X: string = '';
  /** The current Y-axis coordinate as a string (e.g., "20.50"). */
  public Y: string = '';
  /** The current Z-axis coordinate as a string (e.g., "5.25"). */
  public Z: string = '';

  /**
   * Parses a raw string replay (typically from an M114 command) to populate
   * the X, Y, and Z coordinate properties of this instance.
   *
   * The parsing logic assumes the replay is a multi-line string where the second line
   * (data[1]) contains the coordinate data in a format like "X:10.00 Y:20.50 Z:5.25 ...".
   * It splits this line by spaces and then extracts the values for X, Y, and Z by
   * removing the prefixes "X:", "Y:", and "Z:".
   *
   * @param replay The raw multi-line string response from the printer.
   * @returns The populated `LocationInfo` instance, or null if parsing fails
   *          (e.g., due to unexpected format or null/empty replay).
   */
  public fromReplay(replay: string): LocationInfo | null {
    try {
      const lines = replay
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const positionLine = lines.find((line) => /\bX:\s*-?\d/.test(line));
      if (!positionLine) return null;

      const xMatch = positionLine.match(/X:\s*(-?\d+\.?\d*)/i);
      const yMatch = positionLine.match(/Y:\s*(-?\d+\.?\d*)/i);
      const zMatch = positionLine.match(/Z:\s*(-?\d+\.?\d*)/i);
      if (!xMatch || !yMatch || !zMatch) return null;

      this.X = xMatch[1];
      this.Y = yMatch[1];
      this.Z = zMatch[1];
      return this;
    } catch (_error) {
      console.log('LocationInfo replay has bad/null data');
      return null;
    }
  }

  /**
   * Returns a string representation of the location information.
   * @returns A string in the format "X: [X_value] Y: [Y_value] Z: [Z_value]".
   */
  public toString(): string {
    return `X: ${this.X} Y: ${this.Y} Z: ${this.Z}`;
  }
}
