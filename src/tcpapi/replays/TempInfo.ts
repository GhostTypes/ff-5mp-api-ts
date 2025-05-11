// src/tcpapi/replays/TempInfo.ts
export class TempInfo {
    private _extruderTemp: TempData | null = null;
    private _bedTemp: TempData | null = null;

    public fromReplay(replay: string): TempInfo | null {
        if (!replay) return null;

        try {
            const data = replay.split('\n');
            if (data.length <= 1) {
                console.log("TempInfo replay has invalid data?: " + data);
                return null;
            }

            const tempData = data[1].split(' ');
            let extruderData = null;
            let bedData = null;
            
            // Parse each temperature segment
            for (const segment of tempData) {
                // Check for extruder temperature (T0 or T) - some printers use T): instead of T0:
                // Check for different extruder temperature formats
                if (segment.startsWith('T0:')) {
                    extruderData = segment.replace('T0:', '');
                } else if (segment.startsWith('T):')) {
                    extruderData = segment.replace('T):', '');
                } else if (segment.startsWith('T:')) {
                    extruderData = segment.replace('T:', '');
                }
                // Check for bed temperature
                else if (segment.startsWith('B:')) {
                    bedData = segment.replace('B:', '');
                }
            }
            
            // If we found extruder data, create TempData object
            if (extruderData) {
                this._extruderTemp = new TempData(extruderData);
            } else {
                console.log("No extruder temperature found in replay data");
                return null;
            }
            
            // If we found bed data, create TempData object
            if (bedData) {
                this._bedTemp = new TempData(bedData);
            } else {
                console.log("No bed temperature found in replay data");
                // Create a default bed temperature with 0/0 if not found
                this._bedTemp = new TempData('0/0');
            }
            
            return this;
        } catch (error) {
            console.log("Unable to create TempInfo instance from replay: " + (error instanceof Error ? error.message : String(error)));
            console.log("Raw replay data: " + replay);
            return null;
        }
    }

    public getExtruderTemp(): TempData | null {
        return this._extruderTemp;
    }

    public getBedTemp(): TempData | null {
        return this._bedTemp;
    }

    public isCooled(): boolean {
        const bedTemp = this._bedTemp ? this._bedTemp.getCurrent() : 0;
        const extruderTemp = this._extruderTemp ? this._extruderTemp.getCurrent() : 0;
        return bedTemp <= 40 && extruderTemp <= 200;
    }

    public areTempsSafe(): boolean {
        const bedTemp = this._bedTemp ? this._bedTemp.getCurrent() : 0;
        const extruderTemp = this._extruderTemp ? this._extruderTemp.getCurrent() : 0;
        return extruderTemp < 250 && bedTemp < 100;
    }
}

export class TempData {
    private readonly _current: string;
    private readonly _set: string | null;

    constructor(data: string) {
        // Handle potential formatting issues by removing any non-relevant part
        data = data.replace('/0.0', ''); // Remove trailing '/0.0' if exists
        
        if (data.includes("/")) {
            // replay has current/set temps
            const splitTemps = data.split('/');
            this._current = this.parseTdata(splitTemps[0].trim());
            this._set = this.parseTdata(splitTemps[1].trim());
        } else {
            // replay only has current temp (when printer is idle)
            this._current = this.parseTdata(data);
            this._set = null;
        }
    }

    private parseTdata(data: string): string {
        if (data.includes(".")) data = data.split('.')[0].trim();
        const temp = Math.round(parseFloat(data));
        return temp.toString();
    }

    public getFull(): string {
        if (this._set === null) return this._current;
        return this._current + "/" + this._set;
    }

    public getCurrent(): number {
        return parseInt(this._current, 10);
    }

    public getSet(): number {
        return this._set ? parseInt(this._set, 10) : 0;
    }
}