// src/tcpapi/replays/PrintStatus.ts
export class PrintStatus {
    public _sdCurrent: string = '';
    public _sdTotal: string = '';
    public _layerCurrent: string = '';
    public _layerTotal: string = '';

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
        const currentLayer = parseInt(this._layerCurrent, 10);
        const totalLayers = parseInt(this._layerTotal, 10);
        const perc = (currentLayer / totalLayers) * 100;
        return Math.round(Math.min(100, Math.max(0, perc))); // Clamp between 0 and 100
    }

    public getLayerProgress(): string {
        return this._layerCurrent + "/" + this._layerTotal;
    }

    public getSdProgress(): string {
        return this._sdCurrent + "/" + this._sdTotal;
    }
}