// src/tcpapi/replays/PrintStatus.ts
export class PrintStatus {
    // This shouldn't be used by anything. Rely on the new api
    private _sdCurrent: string = '';
    private _sdTotal: string = '';
    private _layerCurrent: string = '';
    private _layerTotal: string = '';

    public fromReplay(replay: string): PrintStatus | null {
        try {
            const data = replay.split('\n');
            const sdProgress = data[1].replace("SD printing byte ", "").trim();
            const sdProgressData = sdProgress.split('/');
            this._sdCurrent = sdProgressData[0].trim();
            this._sdTotal = sdProgressData[1].trim();

            let layerProgress;
            try {
                layerProgress = data[2].replace("Layer: ", "").trim();
            } catch (error) {
                console.log("PrintStatus bad layer progress");
                console.log("Raw printer replay: " + replay);
                return null;
            }

            try {
                const lpData = layerProgress.split('/');
                this._layerCurrent = lpData[0].trim();
                this._layerTotal = lpData[1].trim();
                return this;
            } catch (error) {
                console.log("PrintStatus bad layer progress");
                console.log("layerProgress: " + layerProgress);
                return null;
            }
        } catch (error) {
            console.log("Error parsing print status");
            return null;
        }
    }

    public getPrintPercent(): number {
        const current = parseInt(this._sdCurrent, 10);
        const total = parseInt(this._sdTotal, 10);
        const perc = (current / total) * 100;
        return Math.round(perc);
    }

    public getLayerProgress(): string {
        return this._layerCurrent + "/" + this._layerTotal;
    }

    public getSdProgress(): string {
        return this._sdCurrent + "/" + this._sdTotal;
    }
}