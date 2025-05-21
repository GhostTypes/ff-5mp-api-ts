// src/tcpapi/replays/ThumbnailInfo.ts
import * as fs from 'fs';
import * as path from 'path';

/**
 * Handles the parsing, storage, and manipulation of 3D print file thumbnail images.
 * Thumbnails are typically retrieved from the printer using a command like M662,
 * which returns a mixed response containing text (e.g., "ok") followed by raw binary PNG data.
 * This class provides methods to extract the PNG data, convert it to various formats, and save it to a file.
 */
export class ThumbnailInfo {
    /** Raw binary image data for the thumbnail, stored as a Buffer. Null if no data is loaded or parsing fails. */
    private _imageData: Buffer | null = null;
    /** The original filename associated with this thumbnail. Null if not set. */
    private _fileName: string | null = null;

    /**
     * Parses thumbnail data from a raw printer response string.
     * The method expects the response to contain an "ok" text delimiter, after which
     * the binary PNG data begins. It searches for the PNG signature (0x89 PNG)
     * within the binary portion to correctly extract the image.
     *
     * @param replay The raw string response from the printer, which may include text and binary data.
     * @param fileName The name of the file for which the thumbnail was retrieved. This is stored for reference.
     * @returns A `ThumbnailInfo` instance populated with the image data if parsing is successful,
     *          or null if the replay is invalid, "ok" is not found, or the PNG signature is missing.
     */
    public fromReplay(replay: string, fileName: string): ThumbnailInfo | null {
        if (!replay) return null;

        try {
            // Store the file name
            this._fileName = fileName;
            
            // Find where the PNG data starts (after the "ok" text delimiter)
            const okIndex = replay.indexOf('ok');
            if (okIndex === -1) {
                console.log("ThumbnailInfo: No 'ok' found in response");
                return null;
            }

            // Skip the 'ok' text and any immediately following control characters
            // The actual binary data starts after "ok".
            const binaryStartIndex = okIndex + 2; // Length of "ok"
            const rawBinaryData = replay.substring(binaryStartIndex);

            // Convert the extracted string part (assumed to be binary) into a Buffer.
            // The printer sends binary data as part of a string reply.
            const binaryBuffer = Buffer.from(rawBinaryData, 'binary');
            
            // Look for the PNG file signature (89 50 4E 47 0D 0A 1A 0A) in the buffer
            // to correctly identify the start of the actual image data.
            let pngStart = -1;
            for (let i = 0; i < binaryBuffer.length - 7; i++) { // Ensure there's enough space for the full signature
                if (binaryBuffer[i] === 0x89 && 
                    binaryBuffer[i+1] === 0x50 && // P
                    binaryBuffer[i+2] === 0x4E && // N
                    binaryBuffer[i+3] === 0x47 && // G
                    binaryBuffer[i+4] === 0x0D && // CR
                    binaryBuffer[i+5] === 0x0A && // LF
                    binaryBuffer[i+6] === 0x1A && // SUB
                    binaryBuffer[i+7] === 0x0A) { // LF
                    pngStart = i;
                    break;
                }
            }
            
            if (pngStart >= 0) {
                // Slice the buffer from the start of the PNG signature to get the clean image data.
                this._imageData = binaryBuffer.slice(pngStart);
                return this;
            } else {
                console.log("ThumbnailInfo: No PNG signature found in binary data.");
                return null;
            }
        } catch (error) {
            console.error("ThumbnailInfo: Error parsing response:", error instanceof Error ? error.message : String(error));
            return null;
        }
    }

    /**
     * Gets the raw thumbnail image data as a Base64 encoded string.
     * @returns A Base64 encoded string of the PNG image data, or null if no image data is available.
     */
    public getImageData(): string | null {
        if (!this._imageData) return null;
        return this._imageData.toString('base64');
    }

    /**
     * Gets the file name associated with this thumbnail.
     * @returns The file name string, or null if it was not set during parsing.
     */
    public getFileName(): string | null {
        return this._fileName;
    }

    /**
     * Converts the thumbnail image data to a Base64 data URL, suitable for embedding in web pages (e.g., `<img>` src attribute).
     * @returns A Base64 data URL string (e.g., "data:image/png;base64,..."), or null if no image data is available.
     */
    public toBase64DataUrl(): string | null {
        if (!this._imageData) return null;
        
        const base64Data = this._imageData.toString('base64');
        return `data:image/png;base64,${base64Data}`;
    }

    /**
     * Saves the thumbnail image data to a file.
     * If no `filePath` is provided, it attempts to generate a filename using the
     * original filename (stored during `fromReplay`) with a ".png" extension.
     *
     * @param filePath Optional. The full path (including filename and extension) where the thumbnail should be saved.
     *                 If not provided, a filename is generated from `this._fileName`.
     * @returns A Promise that resolves to true if the file was saved successfully, false otherwise.
     */
    public async saveToFile(filePath?: string): Promise<boolean> {
        if (!this._imageData) {
            console.log("ThumbnailInfo: No image data to save");
            return false;
        }

        try {
            // If no file path is provided, generate one based on the original filename
            if (!filePath && this._fileName) {
                // Extract the filename without extension
                const baseName = path.basename(this._fileName, path.extname(this._fileName));
                filePath = `${baseName}.png`;
            }

            if (!filePath) {
                console.log("ThumbnailInfo: No file path provided and no filename to generate one from");
                return false;
            }

            // Write the buffer to file
            fs.writeFileSync(filePath, this._imageData);
            console.log(`ThumbnailInfo: Saved thumbnail to ${filePath}`);
            return true;
        } catch (error) {
            console.log("ThumbnailInfo: Error saving thumbnail to file: " + 
                (error instanceof Error ? error.message : String(error)));
            return false;
        }
    }
}
