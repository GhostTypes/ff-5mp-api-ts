// src/api/PrinterDiscovery.ts
import * as dgram from 'dgram';
import { networkInterfaces } from 'os';

// Network discovery of FlashForge printers
export class FlashForgePrinter {
    public name: string = '';
    public serialNumber: string = '';
    public ipAddress: string = '';

    public toString(): string {
        return `Name: ${this.name}, Serial: ${this.serialNumber}, IP: ${this.ipAddress}`;
    }
}

export class FlashForgePrinterDiscovery {
    private static readonly DISCOVERY_PORT = 48899;

    // Instance property for easy access to the discovery port
    private readonly discoveryPort = FlashForgePrinterDiscovery.DISCOVERY_PORT;

    public async discoverPrintersAsync(timeoutMs: number = 10000, idleTimeoutMs: number = 1500, maxRetries: number = 3): Promise<FlashForgePrinter[]> {
        const printers: FlashForgePrinter[] = [];
        const broadcastAddresses = this.getBroadcastAddresses();
        let attempt = 0;

        while (attempt < maxRetries) {
            attempt++;

            const udpClient = dgram.createSocket({ type: 'udp4', reuseAddr: true });

            try {
                // Set up socket
                await new Promise<void>((resolve) => {
                    // Bind to port 18007 to receive responses
                    udpClient.bind(18007, () => {
                        udpClient.setBroadcast(true);
                        resolve();
                    });
                });

                // Send discovery message to all broadcast addresses
                // This is the exact discovery packet seen in Wireshark from FlashPrint
                const discoveryMessage = Buffer.from([
                    0x77, 0x77, 0x77, 0x2e, 0x75, 0x73, 0x72, 0x22, 
                    0x65, 0x36, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x00, 
                    0x00, 0x00, 0x00, 0x00
                ]);
                for (const broadcastAddress of broadcastAddresses) {
                    try {
                        udpClient.send(discoveryMessage, this.discoveryPort, broadcastAddress);
                    } catch (ex) {
                        console.log(`Failed to send to ${broadcastAddress}: ${(ex as Error).message}`);
                    }
                }

                try {
                    await this.receivePrinterResponses(udpClient, printers, timeoutMs, idleTimeoutMs);
                } catch (ex) {
                    console.log(`ReceivePrinterResponses error: ${(ex as Error).message}`);
                }
            } finally {
                udpClient.close();
            }

            if (printers.length > 0) {
                break; // Printers found, exit the retry loop
            }

            if (attempt >= maxRetries) continue;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retrying
        }


        return printers;
    }

    private async receivePrinterResponses(
        udpClient: dgram.Socket,
        printers: FlashForgePrinter[],
        totalTimeoutMs: number,
        idleTimeoutMs: number
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            let totalTimeoutHandle: NodeJS.Timeout | null = null;
            let idleTimeoutHandle: NodeJS.Timeout | null = null;

            const cleanupAndResolve = () => {
                if (totalTimeoutHandle) clearTimeout(totalTimeoutHandle);
                if (idleTimeoutHandle) clearTimeout(idleTimeoutHandle);
                udpClient.removeAllListeners('message');
                udpClient.removeAllListeners('error');
                resolve();
            };

            // Set total timeout
            totalTimeoutHandle = setTimeout(() => {
                cleanupAndResolve();
            }, totalTimeoutMs);

            const resetIdleTimeout = () => {
                if (idleTimeoutHandle) clearTimeout(idleTimeoutHandle);
                idleTimeoutHandle = setTimeout(() => {
                    cleanupAndResolve();
                }, idleTimeoutMs);
            };

            // Handle incoming messages
            udpClient.on('message', (buffer, rinfo) => {
                resetIdleTimeout();

                const printer = this.parsePrinterResponse(buffer, rinfo.address);
                if (printer) {
                    printers.push(printer);
                }
            });

            // Handle errors
            udpClient.on('error', (err) => {
                console.log(`Socket error: ${err.message}`);
                reject(err);
                cleanupAndResolve();
            });

            // Start the idle timeout
            resetIdleTimeout();
        });
    }

    private parsePrinterResponse(response: Buffer, ipAddress: string): FlashForgePrinter | null {
        if (!response || response.length < 0xC4) {
            console.log("Invalid response, discarded.");
            return null;
        }

        const name = response.toString('ascii', 0, 32).replace(/\0+$/, ''); // Printer name (offset 0x00)
        const serialNumber = response.toString('ascii', 0x92, 0x92 + 32).replace(/\0+$/, ''); // Serial number (offset 0x92)

        const printer = new FlashForgePrinter();
        printer.name = name;
        printer.serialNumber = serialNumber;
        printer.ipAddress = ipAddress;

        return printer;
    }

    private getBroadcastAddresses(): string[] {
        const broadcastAddresses: string[] = [];
        const interfaces = networkInterfaces();

        for (const [name, netInterface] of Object.entries(interfaces)) {
            if (!netInterface) continue;

            for (const iface of netInterface) {
                // Skip non-IPv4 and internal/loopback interfaces
                if (iface.family !== 'IPv4' || iface.internal || !iface.netmask) {
                    continue;
                }

                // Calculate broadcast address based on IP and netmask
                const broadcastAddress = this.calculateBroadcastAddress(iface.address, iface.netmask);
                if (broadcastAddress) {
                    broadcastAddresses.push(broadcastAddress);
                }
            }
        }

        return broadcastAddresses;
    }

    private calculateBroadcastAddress(ipAddress: string, subnetMask: string): string | null {
        try {
            // Convert IP and subnet to arrays of numbers
            const ip = ipAddress.split('.').map(Number);
            const mask = subnetMask.split('.').map(Number);

            if (ip.length !== 4 || mask.length !== 4) {
                return null;
            }

            // Calculate broadcast address: IP | (~MASK)
            const broadcast = ip.map((octet, index) => octet | (~mask[index] & 255));
            return broadcast.join('.');
        } catch (error) {
            console.log(`Error calculating broadcast address: ${(error as Error).message}`);
            return null;
        }
    }

    public printDebugInfo(response: Buffer, ipAddress: string): void {
        console.log(`Received response from ${ipAddress}:`);
        console.log(`Response length: ${response.length} bytes`);

        // Hex dump
        console.log("Hex dump:");
        for (let i = 0; i < response.length; i += 16) {
            let line = `${i.toString(16).padStart(4, '0')}   `;

            // Hex values
            for (let j = 0; j < 16; j++) {
                if (i + j < response.length) {
                    line += `${response[i + j].toString(16).padStart(2, '0')} `;
                } else {
                    line += "   ";
                }

                if (j === 7) line += " ";
            }

            // ASCII representation
            line += "  ";
            for (let j = 0; j < 16 && i + j < response.length; j++) {
                const c = response[i + j];
                line += (c >= 32 && c <= 126) ? String.fromCharCode(c) : '.';
            }

            console.log(line);
        }

        // ASCII dump
        console.log("ASCII dump:");
        console.log(response.toString('ascii'));
    }
}