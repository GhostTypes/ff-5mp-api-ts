/**
 * @fileoverview Parses M105 command responses to extract extruder and bed temperatures with current and target values.
 */
// src/tcpapi/replays/TempInfo.ts
/**
 * Represents the temperature information for the printer's extruder and bed.
 * This data is typically parsed from the response of an M105 G-code command,
 * which reports the current and target temperatures.
 */
export class TempInfo {
  /** Temperature data for the extruder. See {@link TempData}. */
  private _extruderTemp: TempData | null = null;
  /** Temperature data for the print bed. See {@link TempData}. */
  private _bedTemp: TempData | null = null;

  /**
   * Parses a raw string replay (typically from an M105 command) to populate
   * the extruder and bed temperature properties of this instance.
   *
   * The M105 response format is usually a single line (after the "ok" or command echo)
   * containing temperature segments like "T0:25/0" or "T:210/210 B:60/60".
   * This method splits the relevant line by spaces and then parses each segment.
   * It looks for segments starting with "T0:", "T):", or "T:" for extruder temperature,
   * and "B:" for bed temperature.
   *
   * @param replay The raw multi-line string response from the printer.
   * @returns The populated `TempInfo` instance, or null if parsing fails
   *          (e.g., due to unexpected format, missing critical temperature data).
   */
  public fromReplay(replay: string): TempInfo | null {
    if (!replay) return null;

    try {
      const data = replay.split('\n');
      if (data.length <= 1) {
        console.log(`TempInfo replay has invalid data?: ${data}`);
        return null;
      }

      // Relevant temperature data is usually on the second line (data[1])
      // e.g., "T0:25/0 B:28/0 @:0 B@:0" or "T:210/210 B:60/60"
      const tempData = data[1].split(' ');
      let extruderDataStr = null;
      let bedDataStr = null;

      // Parse each temperature segment
      for (const segment of tempData) {
        // Check for extruder temperature (T0, T), or T) for some printers)
        if (segment.startsWith('T0:')) {
          extruderDataStr = segment.replace('T0:', '');
        } else if (segment.startsWith('T):')) {
          // Some printers might use T):
          extruderDataStr = segment.replace('T):', '');
        } else if (segment.startsWith('T:')) {
          // General case for T:
          extruderDataStr = segment.replace('T:', '');
        }
        // Check for bed temperature
        else if (segment.startsWith('B:')) {
          bedDataStr = segment.replace('B:', '');
        }
      }

      // If we found extruder data, create TempData object
      if (extruderDataStr) {
        this._extruderTemp = new TempData(extruderDataStr);
      } else {
        console.log(`No extruder temperature found in replay data: ${replay}`);
        return null; // Extruder temp is critical
      }

      // If we found bed data, create TempData object; otherwise, default to 0/0
      if (bedDataStr) {
        this._bedTemp = new TempData(bedDataStr);
      } else {
        console.log(`No bed temperature found in replay data, defaulting to 0/0: ${replay}`);
        this._bedTemp = new TempData('0/0'); // Default if not present
      }

      return this;
    } catch (error) {
      console.log(
        'Unable to create TempInfo instance from replay: ' +
          (error instanceof Error ? error.message : String(error))
      );
      console.log(`Raw replay data: ${replay}`);
      return null;
    }
  }

  /**
   * Gets the extruder temperature data.
   * @returns A `TempData` object for the extruder, or null if not available.
   */
  public getExtruderTemp(): TempData | null {
    return this._extruderTemp;
  }

  /**
   * Gets the print bed temperature data.
   * @returns A `TempData` object for the bed, or null if not available.
   */
  public getBedTemp(): TempData | null {
    return this._bedTemp;
  }

  /**
   * Checks if both the bed and extruder are cooled down to relatively low temperatures.
   * Bed temperature <= 40°C and extruder temperature <= 200°C (though 200 is still hot).
   * Use with caution, as "cooled" here is relative and 200C is still very hot for an extruder.
   * @returns True if temperatures are at or below the defined thresholds, false otherwise.
   */
  public isCooled(): boolean {
    const bedTemp = this._bedTemp ? this._bedTemp.getCurrent() : 0;
    const extruderTemp = this._extruderTemp ? this._extruderTemp.getCurrent() : 0;
    return bedTemp <= 40 && extruderTemp <= 200;
  }

  /**
   * Checks if the current temperatures are within a generally safe operating range
   * to prevent overheating (extruder < 250°C, bed < 100°C).
   * These are arbitrary "safe" limits and might need adjustment based on specific printer/material.
   * @returns True if temperatures are below the defined "safe" thresholds, false otherwise.
   */
  public areTempsSafe(): boolean {
    const bedTemp = this._bedTemp ? this._bedTemp.getCurrent() : 0;
    const extruderTemp = this._extruderTemp ? this._extruderTemp.getCurrent() : 0;
    return extruderTemp < 250 && bedTemp < 100;
  }
}

/**
 * Represents temperature data for a single component (e.g., extruder or bed),
 * including its current temperature and target (set) temperature.
 * Temperatures are stored as strings but can be retrieved as numbers.
 */
export class TempData {
  /** The current temperature as a string, rounded to the nearest integer. */
  private readonly _current: string;
  /** The target (set) temperature as a string, rounded to the nearest integer. Null if not set (e.g., when idle). */
  private readonly _set: string | null;

  /**
   * Creates an instance of TempData by parsing a temperature string.
   * The input string can be in the format "current/set" (e.g., "210/210")
   * or just "current" (e.g., "25") if the target temperature is not specified.
   * It also handles and removes a trailing "/0.0" if present from some printer firmwares.
   * All temperatures are rounded to the nearest integer.
   * @param data The temperature data string (e.g., "210/210", "25", "60/60/0.0").
   */
  constructor(data: string) {
    // Handle potential formatting issues by removing any non-relevant part
    data = data.replace('/0.0', ''); // Remove trailing '/0.0' if exists, specific to some firmware outputs

    if (data.includes('/')) {
      // replay has current/set temps
      const splitTemps = data.split('/');
      this._current = this.parseTdata(splitTemps[0].trim());
      this._set = this.parseTdata(splitTemps[1].trim());
    } else {
      // replay only has current temp (when printer is idle)
      this._current = this.parseTdata(data);
      this._set = null;
    }
  }

  /**
   * Parses a raw temperature string value, rounds it, and returns it as a string.
   * If the value contains a decimal point, it's truncated before rounding.
   * @param data The raw temperature string (e.g., "210.5", "60").
   * @returns The rounded temperature as a string.
   * @private
   */
  private parseTdata(data: string): string {
    if (data.includes('.')) data = data.split('.')[0].trim(); // Truncate decimal part before rounding
    const temp = Math.round(parseFloat(data));
    return temp.toString();
  }

  /**
   * Gets the full temperature string, including current and set temperatures.
   * @returns A string in the format "current/set" or just "current" if the set temperature is not available.
   */
  public getFull(): string {
    if (this._set === null) return this._current;
    return `${this._current}/${this._set}`;
  }

  /**
   * Gets the current temperature as a number.
   * @returns The current temperature in Celsius.
   */
  public getCurrent(): number {
    return parseInt(this._current, 10);
  }

  /**
   * Gets the target (set) temperature as a number.
   * @returns The set temperature in Celsius, or 0 if not set.
   */
  public getSet(): number {
    return this._set ? parseInt(this._set, 10) : 0;
  }
}
