/**
 * @fileoverview Parses M27 command responses to extract print job progress including SD card bytes and layer counts.
 */
// src/tcpapi/replays/PrintStatus.ts
/**
 * Represents the status of an ongoing print job, including SD card byte progress and layer progress.
 * This information is typically parsed from the response of an M27 G-code command,
 * which reports the print progress from the SD card.
 */
export class PrintStatus {
    /** Current byte count processed from the SD card file. */
    public _sdCurrent: string = '';
    /** Total byte count of the file being printed from the SD card. */
    public _sdTotal: string = '';
    /** Current layer number being printed. */
    public _layerCurrent: string = '';
    /** Total number of layers in the print job. */
    public _layerTotal: string = '';

    /**
     * Parses a raw string replay (typically from an M27 command) to populate
     * the print status properties of this instance.
     *
     * The parsing logic expects a multi-line string:
     * - Line 1 (data[0]): Usually a command echo, ignored.
     * - Line 2 (data[1]): Contains SD card progress, e.g., "SD printing byte 12345/67890".
     *                    It extracts the current and total bytes.
     * - Line 3 (data[2]): Contains layer progress, e.g., "Layer: 10/250".
     *                    It extracts the current and total layers.
     *
     * @param replay The raw multi-line string response from the printer.
     * @returns The populated `PrintStatus` instance, or null if parsing fails
     *          (e.g., due to unexpected format, null/empty replay, or missing data).
     */
    public fromReplay(replay: string): PrintStatus | null {
        try {
            const data = replay.split('\n');
            // Example: "SD printing byte 12345/67890"
            const sdProgress = data[1].replace("SD printing byte ", "").trim();
            const sdProgressData = sdProgress.split('/');
            this._sdCurrent = sdProgressData[0].trim();
            this._sdTotal = sdProgressData[1].trim();

            let layerProgress;
            try {
                // Example: "Layer: 10/250"
                layerProgress = data[2].replace("Layer: ", "").trim();
            } catch (error) {
                console.log("PrintStatus bad layer progress");
                console.log("Raw printer replay: " + replay);
                return null;
            }

            try {
                const lpData = layerProgress.split('/');
                this._layerCurrent = lpData[0].trim();
                this._layerTotal = lpData[1].trim();
                return this;
            } catch (error) {
                console.log("PrintStatus bad layer progress");
                console.log("layerProgress: " + layerProgress);
                return null;
            }
        } catch (error) {
            console.log("Error parsing print status");
            return null;
        }
    }

    /**
     * Calculates the print progress percentage based on the current and total layers.
     * The result is clamped between 0 and 100.
     * @returns The print progress percentage (0-100), rounded to the nearest integer.
     *          Returns NaN if layer information is not available or invalid.
     */
    public getPrintPercent(): number {
        const currentLayer = parseInt(this._layerCurrent, 10);
        const totalLayers = parseInt(this._layerTotal, 10);
        if (isNaN(currentLayer) || isNaN(totalLayers) || totalLayers === 0) {
            return NaN; // Or handle error appropriately, e.g., return 0 or throw
        }
        const perc = (currentLayer / totalLayers) * 100;
        return Math.round(Math.min(100, Math.max(0, perc))); // Clamp between 0 and 100
    }

    /**
     * Gets the layer progress as a string.
     * @returns A string in the format "currentLayer/totalLayers".
     */
    public getLayerProgress(): string {
        return this._layerCurrent + "/" + this._layerTotal;
    }

    /**
     * Gets the SD card byte progress as a string.
     * @returns A string in the format "currentBytes/totalBytes".
     */
    public getSdProgress(): string {
        return this._sdCurrent + "/" + this._sdTotal;
    }
}