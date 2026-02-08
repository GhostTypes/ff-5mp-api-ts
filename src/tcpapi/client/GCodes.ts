/**
 * @fileoverview G-code and M-code command constants for FlashForge TCP communication,
 * providing prefixed command strings for printer operations.
 */
// src/tcpapi/client/GCodes.ts
export class GCodes {
    /** Command to initiate a control session with the printer (login). */
    public static readonly CmdLogin = "~M601 S1";
    /** Command to terminate a control session with the printer (logout). */
    public static readonly CmdLogout = "~M602";

    /** Command for an emergency stop of all printer activity. */
    public static readonly CmdEmergencyStop = "~M112";

    /** Command to request the current print job status. */
    public static readonly CmdPrintStatus = "~M27";
    /** Command to request the status of the printer's endstops. */
    public static readonly CmdEndstopInfo = "~M119";
    /** Command to request general printer information, including firmware version. */
    public static readonly CmdInfoStatus = "~M115";
    /** Command to request the current X, Y, Z, A, B coordinates of the print head. */
    public static readonly CmdInfoXyzab = "~M114";
    /** Command to request current temperatures (extruder, bed). */
    public static readonly CmdTemp = "~M105";

    /** Command to turn the printer's LED lights on (full white). */
    public static readonly CmdLedOn = "~M146 r255 g255 b255 F0";
    /** Command to turn the printer's LED lights off. */
    public static readonly CmdLedOff = "~M146 r0 g0 b0 F0";

    /** Command to enable the filament runout sensor. */
    public static readonly CmdRunoutSensorOn = "~M405";
    /** Command to disable the filament runout sensor. */
    public static readonly CmdRunoutSensorOff = "~M406";

    /** Command to list files stored locally on the printer (typically on internal storage or SD card). */
    public static readonly CmdListLocalFiles = "~M661";
    /** Command to retrieve a thumbnail image for a specified G-code file. Requires a file path argument. */
    public static readonly CmdGetThumbnail = "~M662";

    /** Command to instruct the printer to take a picture with its camera, if equipped. */
    public static readonly TakePicture = "~M240";

    /** Command to home all printer axes (X, Y, Z). (G28) */
    public static readonly CmdHomeAxes = "~G28";

    /** Command to select a file for printing. `%%filename%%` should be replaced with the actual file path. */
    public static readonly CmdStartPrint = "~M23 0:/user/%%filename%%"
    /** Command to pause the current print job. (M25) */
    public static readonly CmdPausePrint = "~M25"
    /** Command to resume a paused print job. (M24) */
    public static readonly CmdResumePrint = "~M24"
    /** Command to stop/cancel the current print job. (M26) */
    public static readonly CmdStopPrint = "~M26"

    /** Command to set extruder temperature and wait until it's reached. Requires S[temperature] parameter. (M109) */
    public static readonly WaitForHotendTemp = "~M109"
    /** Command to set bed temperature and wait until it's reached. Requires S[temperature] or R[temperature] (for cooling) parameter. (M190) */
    public static readonly WaitForBedTemp = "~M190";

    // Commented out commands, potentially for file upload operations, not currently in active use.
    // /** Command to prepare for file upload, specifying size and path. `%%size%%` and `%%filename%%` are placeholders. */
    // public static readonly CmdPrepFileUpload = "~M28 %%size%% 0:/user/%%filename%%"
    // /** Command to indicate completion of file upload. */
    // public static readonly CmdCompleteFileUpload = "~M29"
}