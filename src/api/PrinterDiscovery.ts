// src/api/PrinterDiscovery.ts
import * as dgram from 'dgram';
import { networkInterfaces } from 'os';

/**
 * Represents a discovered FlashForge 3D printer.
 * Stores information such as name, serial number, and IP address.
 */
export class FlashForgePrinter {
    /** The name of the printer. */
    public name: string = '';
    /** The serial number of the printer. */
    public serialNumber: string = '';
    /** The IP address of the printer. */
    public ipAddress: string = '';

    /**
     * Returns a string representation of the FlashForgePrinter object.
     * @returns A string containing the printer's name, serial number, and IP address.
     */
    public toString(): string {
        return `Name: ${this.name}, Serial: ${this.serialNumber}, IP: ${this.ipAddress}`;
    }
}

/**
 * Handles the discovery of FlashForge printers on the local network.
 * Uses UDP broadcast messages to find printers and parses their responses.
 */
export class FlashForgePrinterDiscovery {
    /** The UDP port used for sending discovery messages to FlashForge printers. */
    private static readonly DISCOVERY_PORT = 48899;

    // Instance property for easy access to the discovery port
    /** The UDP port used for sending discovery messages. */
    private readonly discoveryPort = FlashForgePrinterDiscovery.DISCOVERY_PORT;

    /**
     * Discovers FlashForge printers on the network asynchronously.
     * It sends UDP broadcast messages and listens for responses from printers.
     * The discovery process involves sending a specific UDP packet to the `DISCOVERY_PORT`.
     * Printers respond with a packet containing their details, which is then parsed.
     * Retries are implemented in case of no initial response.
     *
     * @param timeoutMs The total time (in milliseconds) to wait for printer responses. Defaults to 10000ms.
     * @param idleTimeoutMs The time (in milliseconds) to wait for additional responses after the last received one. Defaults to 1500ms.
     * @param maxRetries The maximum number of discovery attempts. Defaults to 3.
     * @returns A Promise that resolves to an array of `FlashForgePrinter` objects found on the network.
     */
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
                // The discovery UDP packet is a 20-byte message.
                // It starts with "www.usr" followed by specific bytes.
                // This packet structure is based on observations from FlashPrint software.
                // Bytes:
                // 0x77, 0x77, 0x77, 0x2e, 0x75, 0x73, 0x72, 0x22, (www.usr")
                // 0x65, 0x36, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x00,
                // 0x00, 0x00, 0x00, 0x00
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

    /**
     * Receives and processes printer responses from the UDP socket.
     * Listens for messages on the socket and parses them using `parsePrinterResponse`.
     * Manages timeouts for the overall discovery process and for idle periods between responses.
     *
     * @param udpClient The dgram.Socket instance to listen on.
     * @param printers An array to store the discovered `FlashForgePrinter` objects.
     * @param totalTimeoutMs The total duration (in milliseconds) to listen for responses.
     * @param idleTimeoutMs The maximum idle time (in milliseconds) to wait for a new response before stopping.
     * @returns A Promise that resolves when the listening period is over or an error occurs.
     * @private
     */
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

    /**
     * Parses the UDP response received from a FlashForge printer.
     * The response is a buffer containing printer information at specific offsets.
     * - Printer Name: ASCII string at offset 0x00 (32 bytes).
     * - Serial Number: ASCII string at offset 0x92 (32 bytes).
     *
     * @param response The Buffer containing the printer's response.
     * @param ipAddress The IP address from which the response was received.
     * @returns A `FlashForgePrinter` object if parsing is successful, otherwise null.
     * @private
     */
    private parsePrinterResponse(response: Buffer, ipAddress: string): FlashForgePrinter | null {
        // Expected response length is at least 0xC4 (196 bytes) to contain name and serial.
        if (!response || response.length < 0xC4) {
            console.log("Invalid response, discarded.");
            return null;
        }

        // Printer name is at offset 0x00, padded with null characters.
        const name = response.toString('ascii', 0, 32).replace(/\0+$/, '');
        // Serial number is at offset 0x92, padded with null characters.
        const serialNumber = response.toString('ascii', 0x92, 0x92 + 32).replace(/\0+$/, '');

        const printer = new FlashForgePrinter();
        printer.name = name;
        printer.serialNumber = serialNumber;
        printer.ipAddress = ipAddress;

        return printer;
    }

    /**
     * Retrieves a list of broadcast addresses for all active IPv4 network interfaces.
     * This is used to send the discovery UDP packet to all devices on the local network(s).
     *
     * @returns An array of string representations of broadcast addresses.
     * @private
     */
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

    /**
     * Calculates the broadcast address for a given IP address and subnet mask.
     * The broadcast address is calculated as `IP | (~SUBNET_MASK)`.
     *
     * @param ipAddress The IPv4 address string (e.g., "192.168.1.10").
     * @param subnetMask The IPv4 subnet mask string (e.g., "255.255.255.0").
     * @returns The calculated broadcast address string, or null if input is invalid.
     * @private
     */
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

    /**
     * Prints detailed debugging information about a received UDP response.
     * This includes a hex dump and an ASCII dump of the response buffer.
     * Useful for inspecting the raw data received from printers.
     *
     * @param response The Buffer containing the response data.
     * @param ipAddress The IP address from which the response was received.
     */
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