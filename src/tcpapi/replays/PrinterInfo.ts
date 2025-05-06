// src/tcpapi/replays/PrinterInfo.ts
export class PrinterInfo {
    public TypeName: string = '';
    public Name: string = '';
    public FirmwareVersion: string = '';
    public SerialNumber: string = '';
    public Dimensions: string = '';
    public MacAddress: string = '';
    public ToolCount: string = ''; // unused but in FlashForge fw

    /**
     * Create a PrinterInfo instance from an M115 command replay
     */
    public fromReplay(replay: string): PrinterInfo | null {
        if (!replay) return null;

        try {
            const data = replay.split('\n');
            const name = getRight(data[1]);
            if (name === null) {
                console.log("PrinterInfo replay has null Machine Type");
                return null;
            }
            this.TypeName = name;

            const nick = getRight(data[2]);
            if (nick === null) {
                console.log("PrinterInfo replay has null Machine Name");
                return null;
            }
            this.Name = nick;

            const fw = getRight(data[3]);
            if (fw === null) {
                console.log("PrinterInfo replay has null firmware version");
                return null;
            }
            this.FirmwareVersion = fw;

            const sn = getRight(data[4]);
            if (sn === null) {
                console.log("PrinterInfo replay has null serial number");
                return null;
            }
            this.SerialNumber = sn;

            this.Dimensions = data[5].trim();

            const tcs = getRight(data[6]);
            if (tcs === null) {
                console.log("PrinterInfo replay has null tool count");
                return null;
            }
            this.ToolCount = tcs;

            this.MacAddress = data[7].replace("Mac Address:", "");
            return this;
        } catch (error) {
            console.log("Error creating PrinterInfo instance from replay");
            return null;
        }
    }

    public toString(): string {
        return "Printer Type: " + this.TypeName + "\n" +
            "Name: " + this.Name + "\n" +
            "Firmware: " + this.FirmwareVersion + "\n" +
            "Serial Number: " + this.SerialNumber + "\n" +
            "Print Dimensions: " + this.Dimensions + "\n" +
            "Tool Count: " + this.ToolCount + "\n" +
            "MAC Address: " + this.MacAddress;
    }
}

function getRight(rpData: string): string | null {
    try {
        return rpData.split(':')[1].trim();
    } catch {
        return null;
    }
}