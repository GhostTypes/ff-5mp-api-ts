/**
 * @fileoverview Parses M119 command responses to extract endstop states, machine status, movement mode, and LED state.
 */
// src/tcpapi/replays/EndstopStatus.ts
/**
 * Represents the status of the printer's endstops and various other machine states.
 * This information is typically parsed from the response of an M119 command or a similar
 * consolidated status report from the printer. It includes endstop states, machine operational status,
 * movement mode, LED status, and the currently loaded file.
 */
export class EndstopStatus {
    /** Parsed endstop states (X-max, Y-max, Z-min). See {@link Endstop}. */
    public _Endstop: Endstop | null = null;
    /** Current operational status of the machine. See {@link MachineStatus}. */
    public _MachineStatus: MachineStatus = MachineStatus.DEFAULT;
    /** Current movement mode of the printer. See {@link MoveMode}. */
    public _MoveMode: MoveMode = MoveMode.DEFAULT;
    /** Additional status flags (S, L, J, F). See {@link Status}. */
    public _Status: Status | null = null;
    /** Indicates if the printer's LED lights are currently enabled. */
    public _LedEnabled: boolean = false;
    /** Name of the file currently loaded or being printed. Null if no file is active. */
    public _CurrentFile: string | null = null;

    /**
     * Parses a raw string replay (typically from an M119 or similar status command)
     * to populate the properties of this `EndstopStatus` instance.
     * The replay is expected to be a multi-line string where each line provides specific information.
     *
     * Parsing logic:
     * - Line 1 (data[0]): Usually a command echo or header, ignored.
     * - Line 2 (data[1]): Parsed into the `_Endstop` object.
     * - Line 3 (data[2]): Parsed to determine `_MachineStatus` by checking for keywords like "BUILDING_FROM_SD", "PAUSED", "READY".
     * - Line 4 (data[3]): Parsed to determine `_MoveMode` by checking for keywords like "MOVING", "HOMING", "READY".
     * - Line 5 (data[4]): Parsed into the `_Status` object.
     * - Line 6 (data[5]): Parsed to determine `_LedEnabled` (1 for true, 0 for false).
     * - Line 7 (data[6]): Parsed to get `_CurrentFile`, or null if empty.
     *
     * @param replay The raw multi-line string response from the printer.
     * @returns The populated `EndstopStatus` instance, or null if parsing fails or the replay is invalid.
     */
    public fromReplay(replay: string): EndstopStatus | null {
        if (!replay) return null;

        try {
            const data = replay.split('\n');
            this._Endstop = new Endstop(data[1]);

            const machineStatus = data[2].replace("MachineStatus: ", "").trim();
            if (machineStatus.includes("BUILDING_FROM_SD")) this._MachineStatus = MachineStatus.BUILDING_FROM_SD;
            else if (machineStatus.includes("BUILDING_COMPLETED")) this._MachineStatus = MachineStatus.BUILDING_COMPLETED;
            else if (machineStatus.includes("PAUSED")) this._MachineStatus = MachineStatus.PAUSED;
            else if (machineStatus.includes("READY")) this._MachineStatus = MachineStatus.READY;
            else if (machineStatus.includes("BUSY")) this._MachineStatus = MachineStatus.BUSY;
            else {
                console.log("EndstopStatus Encountered unknown MachineStatus: " + machineStatus);
                this._MachineStatus = MachineStatus.DEFAULT;
            }

            const moveM = data[3].replace("MoveMode: ", "").trim();
            if (moveM.includes("MOVING")) this._MoveMode = MoveMode.MOVING;
            else if (moveM.includes("PAUSED")) this._MoveMode = MoveMode.PAUSED;
            else if (moveM.includes("READY")) this._MoveMode = MoveMode.READY;
            else if (moveM.includes("WAIT_ON_TOOL")) this._MoveMode = MoveMode.WAIT_ON_TOOL;
            else if (moveM.includes("HOMING")) this._MoveMode = MoveMode.HOMING;
            else {
                console.log("EndstopStatus Encountered unknown MoveMode: " + moveM);
                this._MoveMode = MoveMode.DEFAULT;
            }

            this._Status = new Status(data[4]);
            this._LedEnabled = parseInt(data[5].replace("LED: ", "").trim()) === 1;
            this._CurrentFile = data[6].replace("CurrentFile: ", "").trim();
            if (!this._CurrentFile || this._CurrentFile === "") this._CurrentFile = null;

            return this;
        } catch (e) {
            console.log("Unable to create EndstopStatus instance from replay");
            console.log(replay);
            //console.log(e.stack);
            return null;
        }
    }

    /**
     * Checks if the machine status indicates that a print has been completed.
     * @returns True if `_MachineStatus` is `BUILDING_COMPLETED`, false otherwise.
     */
    public isPrintComplete(): boolean {
        return this._MachineStatus === MachineStatus.BUILDING_COMPLETED;
    }

    /**
     * Checks if the machine status indicates that a print is currently in progress from SD.
     * @returns True if `_MachineStatus` is `BUILDING_FROM_SD`, false otherwise.
     */
    public isPrinting(): boolean {
        return this._MachineStatus === MachineStatus.BUILDING_FROM_SD;
    }

    /**
     * Checks if the printer is in a ready state (both move mode and machine status are READY).
     * @returns True if the printer is ready, false otherwise.
     */
    public isReady(): boolean {
        return this._MoveMode === MoveMode.READY && this._MachineStatus === MachineStatus.READY;
    }

    /**
     * Checks if the printer is currently paused (either machine status or move mode is PAUSED).
     * @returns True if the printer is paused, false otherwise.
     */
    public isPaused(): boolean {
        return this._MachineStatus === MachineStatus.PAUSED || this._MoveMode === MoveMode.PAUSED;
    }
}

/**
 * Represents additional status flags parsed from a status line.
 * The meaning of S, L, J, F flags can be specific to printer firmware or model.
 */
export class Status {
    /** Status flag S (meaning may vary). */
    public S: number = 0;
    /** Status flag L (meaning may vary). */
    public L: number = 0;
    /** Status flag J (meaning may vary). */
    public J: number = 0;
    /** Status flag F (meaning may vary). */
    public F: number = 0;

    /**
     * Creates an instance of Status by parsing a string line.
     * It uses a regular expression to find key-value pairs like "S:0".
     * @param data The string line containing status flags (e.g., "Status S:0 L:0 J:0 F:0").
     */
    constructor(data: string) {
        this.S = getValue(data, "S");
        this.L = getValue(data, "L");
        this.J = getValue(data, "J");
        this.F = getValue(data, "F");
    }
}

/**
 * Represents the state of the printer's endstops.
 * Typically, a value of 0 means not triggered, and 1 means triggered.
 */
export class Endstop {
    /** State of the X-axis maximum endstop. */
    public Xmax: number = 0;
    /** State of the Y-axis maximum endstop. */
    public Ymax: number = 0;
    /** State of the Z-axis minimum endstop. */
    public Zmin: number = 0;

    /**
     * Creates an instance of Endstop by parsing a string line.
     * It uses a regular expression to find key-value pairs like "X-max:0".
     * @param data The string line containing endstop states (e.g., "Endstop X-max:0 Y-max:0 Z-min:1").
     */
    constructor(data: string) {
        this.Xmax = getValue(data, "X-max");
        this.Ymax = getValue(data, "Y-max");
        this.Zmin = getValue(data, "Z-min");
    }
}

/**
 * Helper function to extract a numeric value associated with a key from a string.
 * Uses a regular expression `key:(\d+)` to find the value.
 * @param input The string to search within.
 * @param key The key whose numeric value is to be extracted.
 * @returns The parsed integer value, or -1 if the key is not found or parsing fails.
 * @private
 */
function getValue(input: string, key: string): number {
    const pattern = new RegExp(key + `:(\\d+)`);
    const match = input.match(pattern);
    if (match && match[1]) return parseInt(match[1], 10);
    return -1;
}

/**
 * Enumerates the possible operational statuses of the machine.
 */
export enum MachineStatus {
    /** Printer is actively printing from SD card or internal storage. */
    BUILDING_FROM_SD,
    /** Printer has completed the print job. */
    BUILDING_COMPLETED,
    /** Printer is paused (often during a print job). */
    PAUSED,
    /** Printer is ready for new commands or to start a job. */
    READY,
    /** Printer is busy with some other operation. */
    BUSY,
    /** Default or unknown machine status. */
    DEFAULT
}

/**
 * Enumerates the possible movement modes of the printer.
 */
export enum MoveMode {
    /** Printer head is currently moving. */
    MOVING,
    /** Printer movement is paused (e.g., during a filament change). */
    PAUSED,
    /** Printer is ready for movement commands. */
    READY,
    /** Printer is waiting for a tool-related action (e.g., tool change, heating). */
    WAIT_ON_TOOL,
    /** Printer is currently performing a homing sequence. */
    HOMING,
    /** Default or unknown movement mode. */
    DEFAULT
}