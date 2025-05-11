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
            
            // Find where the PNG data starts (after the "ok" text)
            const okIndex = replay.indexOf('ok');
            if (okIndex === -1) {
                console.log("ThumbnailInfo: No 'ok' found in response");
                return null;
            }

            // Skip the 'ok' text and any control characters after it
            const binaryStartIndex = okIndex + 2;
            const rawBinaryData = replay.substring(binaryStartIndex);

            // Convert string to binary buffer
            const binaryBuffer = Buffer.from(rawBinaryData, 'binary');
            
            // Look for PNG signature in the buffer (89 50 4E 47 0D 0A 1A 0A)
            let pngStart = -1;
            for (let i = 0; i < binaryBuffer.length - 4; i++) {
                if (binaryBuffer[i] === 0x89 && 
                    binaryBuffer[i+1] === 0x50 && 
                    binaryBuffer[i+2] === 0x4E && 
                    binaryBuffer[i+3] === 0x47) {
                    pngStart = i;
                    break;
                }
            }
            
            if (pngStart >= 0) {
                this._imageData = binaryBuffer.slice(pngStart);
                return this;
            } else {
                console.log("ThumbnailInfo: No PNG signature found");
                return null;
            }
        } catch (error) {
            console.error("ThumbnailInfo: Error parsing response:", error instanceof Error ? error.message : String(error));
            return null;
        }
    }

    /**
     * Get the thumbnail image data as Base64
     * @returns Base64 encoded string of the PNG data or null if no data
     */
    public getImageData(): string | null {
        if (!this._imageData) return null;
        return this._imageData.toString('base64');
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
