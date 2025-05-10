// src/tcpapi/replays/EndstopStatus.ts
export class EndstopStatus {
    public _Endstop: Endstop | null = null;
    public _MachineStatus: MachineStatus = MachineStatus.DEFAULT;
    public _MoveMode: MoveMode = MoveMode.DEFAULT;
    public _Status: Status | null = null;
    public _LedEnabled: boolean = false;
    public _CurrentFile: string | null = null;

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

    public isPrintComplete(): boolean {
        return this._MachineStatus === MachineStatus.BUILDING_COMPLETED;
    }

    public isPrinting(): boolean {
        return this._MachineStatus === MachineStatus.BUILDING_FROM_SD;
    }

    public isReady(): boolean {
        return this._MoveMode === MoveMode.READY && this._MachineStatus === MachineStatus.READY;
    }

    public isPaused(): boolean {
        return this._MachineStatus === MachineStatus.PAUSED || this._MoveMode === MoveMode.PAUSED;
    }
}

export class Status {
    public S: number = 0;
    public L: number = 0;
    public J: number = 0;
    public F: number = 0;

    constructor(data: string) {
        this.S = getValue(data, "S");
        this.L = getValue(data, "L");
        this.J = getValue(data, "J");
        this.F = getValue(data, "F");
    }
}

export class Endstop {
    public Xmax: number = 0;
    public Ymax: number = 0;
    public Zmin: number = 0;

    constructor(data: string) {
        this.Xmax = getValue(data, "X-max");
        this.Ymax = getValue(data, "Y-max");
        this.Zmin = getValue(data, "Z-min");
    }
}

function getValue(input: string, key: string): number {
    const pattern = new RegExp(key + `:(\\d+)`);
    const match = input.match(pattern);
    if (match && match[1]) return parseInt(match[1], 10);
    return -1;
}

export enum MachineStatus {
    BUILDING_FROM_SD,
    BUILDING_COMPLETED,
    PAUSED,
    READY,
    BUSY,
    DEFAULT
}

export enum MoveMode {
    MOVING,
    PAUSED,
    READY,
    WAIT_ON_TOOL,
    HOMING,
    DEFAULT
}