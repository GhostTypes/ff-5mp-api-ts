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
            const data = replay.split('\n');
            // The first line (data[0]) is often the command echo (e.g., "ok M114") or similar,
            // actual coordinate data is expected on the second line.
            const locData = data[1].split(' ');
            this.X = locData[0].replace("X:", "").trim();
            this.Y = locData[1].replace("Y:", "").trim();
            this.Z = locData[2].replace("Z:", "").trim();
            return this;
        } catch (error) {
            console.log("LocationInfo replay has bad/null data");
            return null;
        }
    }

    /**
     * Returns a string representation of the location information.
     * @returns A string in the format "X: [X_value] Y: [Y_value] Z: [Z_value]".
     */
    public toString(): string {
        return "X: " + this.X + " Y: " + this.Y + " Z: " + this.Z;
    }
}