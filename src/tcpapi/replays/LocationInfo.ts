// src/tcpapi/replays/LocationInfo.ts
export class LocationInfo {
    public X: string = '';
    public Y: string = '';
    public Z: string = '';

    public fromReplay(replay: string): LocationInfo | null {
        try {
            const data = replay.split('\n');
            const locData = data[1].split(' ');
            this.X = locData[0].replace("X:", "").trim();
            this.Y = locData[1].replace("Y:", "").trim();
            this.Z = locData[2].replace("Z:", "").trim();
            return this;
        } catch (error) {
            console.log("LocationInfo replay has bad/null data");
            return null;
        }
    }

    public toString(): string {
        return "X: " + this.X + " Y: " + this.Y + " Z: " + this.Z;
    }
}