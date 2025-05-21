// src/api/server/Endpoints.ts
/**
 * Defines a collection of API endpoint paths for interacting with the FlashForge 3D printer.
 * These paths are appended to the printer's base IP address and port to form complete URLs
 * for various API requests.
 */
export class Endpoints {
    /** Endpoint for sending control commands to the printer (e.g., light control, job control, temperature control). */
    static readonly Control = "/control";
    /** Endpoint for retrieving detailed information and status about the printer. */
    static readonly Detail = "/detail";
    /** Endpoint for fetching a list of G-code files, typically recently printed ones. */
    static readonly GCodeList = "/gcodeList";
    /** Endpoint for initiating a print job from a G-code file stored on the printer. */
    static readonly GCodePrint = "/printGcode";
    /** Endpoint for retrieving thumbnail images associated with G-code files. */
    static readonly GCodeThumb = "/gcodeThumb";
    /** Endpoint for retrieving product information, including serial number and check code for authentication. */
    static readonly Product = "/product";
    /** Endpoint for uploading G-code files to the printer. */
    static readonly UploadFile = "/uploadGcode";
}