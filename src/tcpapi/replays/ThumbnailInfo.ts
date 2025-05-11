// src/tcpapi/replays/ThumbnailInfo.ts
import * as fs from 'fs';
import * as path from 'path';

/**
 * Class to handle 3D print file thumbnails
 */
export class ThumbnailInfo {
    private _imageData: Buffer | null = null;
    private _fileName: string | null = null;

    /**
     * Parse the thumbnail data from a printer response
     * @param replay The raw response from the printer
     * @param fileName The name of the file
     * @returns ThumbnailInfo instance or null if parsing failed
     */
    public fromReplay(replay: string, fileName: string): ThumbnailInfo | null {
        if (!replay) return null;

        try {
            // Store the file name
            this._fileName = fileName;
            
            // Find where the PNG data starts (after the "ok" line)
            const okIndex = replay.indexOf('ok');
            if (okIndex === -1) {
                console.log("ThumbnailInfo: No 'ok' found in response");
                return null;
            }

            // The binary data starts after the "ok" and newline
            const binaryStart = okIndex + 2;
            
            // Convert the raw string to a buffer, skipping the text part
            const rawData = replay.substring(binaryStart);
            
            // Convert string to Buffer by using a buffer of UTF-8 bytes, then creating a new buffer without text headers
            const tempBuffer = Buffer.from(rawData, 'binary');
            
            // Find PNG signature in buffer (PNG files start with these bytes: 89 50 4E 47)
            const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
            let pngStart = -1;
            
            // Look for PNG signature in the first 100 bytes of data
            for (let i = 0; i < Math.min(tempBuffer.length, 100); i++) {
                if (tempBuffer[i] === pngSignature[0]) {
                    let found = true;
                    for (let j = 1; j < pngSignature.length; j++) {
                        if (tempBuffer[i + j] !== pngSignature[j]) {
                            found = false;
                            break;
                        }
                    }
                    if (found) {
                        pngStart = i;
                        break;
                    }
                }
            }
            
            if (pngStart === -1) {
                console.log("ThumbnailInfo: No PNG signature found in response");
                return null;
            }
            
            // Create the final image buffer starting from the PNG signature
            this._imageData = Buffer.from(tempBuffer.subarray(pngStart));
            
            return this;
        } catch (error) {
            console.log("Unable to create ThumbnailInfo instance from replay: " + 
                (error instanceof Error ? error.message : String(error)));
            console.log("Raw replay data length: " + replay.length);
            return null;
        }
    }

    /**
     * Get the thumbnail image data as a Buffer
     * @returns Buffer containing the PNG image data or null if no data
     */
    public getImageData(): Buffer | null {
        return this._imageData;
    }

    /**
     * Get the file name associated with this thumbnail
     * @returns The file name or null if not set
     */
    public getFileName(): string | null {
        return this._fileName;
    }

    /**
     * Convert the thumbnail to a Base64 data URL for web display
     * @returns Base64 data URL string or null if no image data
     */
    public toBase64DataUrl(): string | null {
        if (!this._imageData) return null;
        
        const base64Data = this._imageData.toString('base64');
        return `data:image/png;base64,${base64Data}`;
    }

    /**
     * Save the thumbnail to a file
     * @param filePath The path to save the thumbnail to. If not provided, uses the original filename with .png extension
     * @returns Promise<boolean> True if the save was successful, false otherwise
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
