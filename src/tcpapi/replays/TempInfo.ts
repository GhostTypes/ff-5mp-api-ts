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
            const e = tempData[0].replace("T0:", "").replace("/0.0", "");
            const b = tempData[2].replace("B:", "").replace("/0.0", "");

            this._extruderTemp = new TempData(e);
            this._bedTemp = new TempData(b);
            return this;
        } catch (e) {
            console.log("Unable to create TempInfo instance from replay");
            console.log(replay);
            //console.log(e.stack);
            return null;
        }
    }

    public getExtruderTemp(): TempData {
        return this._extruderTemp!;
    }

    public getBedTemp(): TempData {
        return this._bedTemp!;
    }

    public isCooled(): boolean {
        return this._bedTemp!.getCurrent() <= 40 && this._extruderTemp!.getCurrent() <= 200;
    }

    public areTempsSafe(): boolean {
        return this._extruderTemp!.getCurrent() < 250 && this._bedTemp!.getCurrent() < 100;
    }
}

export class TempData {
    private readonly _current: string;
    private readonly _set: string | null;

    constructor(data: string) {
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