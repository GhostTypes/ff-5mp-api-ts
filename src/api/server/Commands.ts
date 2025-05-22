// src/api/server/Commands.ts
/**
 * Defines a collection of command strings used for interacting with the printer's API.
 * These command strings are typically sent as part of a payload to specific API endpoints
 * to instruct the printer to perform certain actions.
 */
export class Commands {
    /** Command for controlling the printer's LED lights (e.g., turning them on or off). */
    static readonly LightControlCmd = "lightControl_cmd";
    /** Command for general printer control actions (e.g., setting speed, Z-offset, fan speeds during a print). */
    static readonly PrinterControlCmd = "printerCtl_cmd";
    /** Command for managing print jobs (e.g., pause, resume, cancel). */
    static readonly JobControlCmd = "jobCtl_cmd";
    /** Command for controlling the printer's air circulation or filtration system. */
    static readonly CirculationControlCmd = "circulateCtl_cmd";
    /** Command for controlling the printer's camera stream (e.g., starting or stopping the stream). */
    static readonly CameraControlCmd = "streamCtrl_cmd";
    /** Command for controlling the printer's temperatures (e.g., setting extruder or bed temperature via HTTP, if supported). */
    static readonly TempControlCmd = "temperatureCtl_cmd";
}