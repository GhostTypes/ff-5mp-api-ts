import * as net from 'net';
import {setTimeout as sleep} from 'timers/promises';
import {GCodes} from "./client/GCodes";

export class FlashForgeTcpClient {
    protected socket: net.Socket | null = null;
    protected readonly port = 8899;
    protected readonly timeout = 5000;
    protected hostname: string;
    private keepAliveCancellationToken: boolean = false;
    private keepAliveErrors: number = 0;
    private socketBusy: boolean = false;

    constructor(hostname: string) {
        this.hostname = hostname;
        try {
            console.log("TcpPrinterClient creation");
            this.connect();
            console.log("Connected");
        } catch (error: unknown) {
            console.log("TcpPrinterClient failed to init!!!");
        }
    }

    public startKeepAlive(): void {
        if (this.keepAliveCancellationToken) return; // already running
        this.keepAliveCancellationToken = false;

        const runKeepAlive = async () => {
            try {
                while (!this.keepAliveCancellationToken) {
                    //console.log("KeepAlive");
                    const result = await this.sendCommandAsync(GCodes.CmdPrintStatus);
                    if (result === null) {
                        // keep alive failed, connection error/timeout etc
                        this.keepAliveErrors++; // keep track of errors
                        //console.log(`Current keep alive failure: ${this.keepAliveErrors}`);
                        break;
                    }

                    if (this.keepAliveErrors > 0) this.keepAliveErrors--; // move back to 0 errors with each "good" keep-alive
                    // increase keep alive timeout based on error count
                    await sleep(5000 + this.keepAliveErrors * 1000);
                }
            } catch (error: unknown) {
                const err = error as Error;
                console.log("KeepAlive encountered an exception: " + err.message);
            }
        };

        runKeepAlive()
    }

    public stopKeepAlive(logout: boolean = false): void {
        if (logout) { this.sendCommandAsync(GCodes.CmdLogout).then(() => {}); } // release control
        this.keepAliveCancellationToken = true;
        console.log("Keep-alive stopped.");
    }

    public async isSocketBusy(): Promise<boolean> {
        return this.socketBusy;
    }

    public async sendCommandAsync(cmd: string): Promise<string | null> {
        if (this.socketBusy) {
            await this.waitUntilSocketAvailable();
        }

        this.socketBusy = true;

        console.log("sendCommand: " + cmd);
        try {
            this.checkSocket();

            return new Promise<string | null>((resolve, reject) => {
                this.socket!.write(cmd + '\n', 'ascii', (err) => {
                    if (err) {
                        this.socketBusy = false;
                        console.error("Error writing command to socket:", err);
                        reject(err);
                        return;
                    }

                    this.receiveMultiLineReplayAsync(cmd)
                        .then(reply => {
                            this.socketBusy = false;
                            if (reply !== null) {
                                //console.log("Received reply for command:", reply);
                                resolve(reply);
                            } else {
                                console.warn("Invalid or no reply received, resetting connection to printer.");
                                this.resetSocket();
                                this.checkSocket();
                                resolve(null);
                            }
                        })
                        .catch(error => {
                            this.socketBusy = false;
                            console.error("Error receiving reply:", error);
                            reject(error);
                        });
                });
            });
        } catch (error: unknown) {
            this.socketBusy = false;
            const err = error as { code?: string, message: string, stack: string };

            if (err.code === 'ENETUNREACH') {
                const errMsg = `Error while connecting. No route to host [${this.hostname}].`;
                console.error(errMsg + "\n" + err.stack);
            } else if (err.code === 'ENOTFOUND') {
                const errMsg = `Error while connecting. Unknown host [${this.hostname}].`;
                console.error(errMsg + "\n" + err.stack);
            } else {
                console.error(`Error while sending command: ${err.message}\n${err.stack}`);
            }
            return null;
        }
    }

    private async waitUntilSocketAvailable(): Promise<void> {
        const maxWaitTime = 10000; // 10 seconds
        const startTime = Date.now();

        while (this.socketBusy && (Date.now() - startTime < maxWaitTime)) {
            await sleep(100);
        }

        if (this.socketBusy) {
            throw new Error("Socket remained busy for too long, timing out");
        }
    }

    private checkSocket(): void {
        console.log("CheckSocket()");
        let fix = false;
        if (this.socket === null) {
            fix = true;
            //console.warn("TcpPrinterClient socket is null");
        } else if (this.socket.destroyed) {
            fix = true;
            //console.warn("TcpPrinterClient socket is closed");
        }

        if (!fix) return;

        console.warn("Reconnecting to TCP socket...");
        this.connect();
        this.startKeepAlive(); // Start this here rather than Connect()
    }

    private connect(): void {
        //console.log("Connect()");
        this.socket = new net.Socket();
        this.socket.connect(this.port, this.hostname);
        this.socket.setTimeout(this.timeout);

        this.socket.on('error', (error) => {
            console.log(`Socket error: ${error.message}`);
        });
    }

    private resetSocket(): void {
        //console.log("ResetSocket()");
        this.stopKeepAlive();
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
    }

    private async receiveMultiLineReplayAsync(cmd: string): Promise<string | null> {
        //console.log("ReceiveMultiLineReplayAsync()");

        if (!this.socket) {
            //console.error("Socket is null, cannot receive reply.");
            return null;
        }

        return new Promise<string | null>((resolve) => {
            const answer: Buffer[] = [];
            let timeoutId: NodeJS.Timeout;
            let lastDataTime = Date.now();

            // Create our handler functions
            const dataHandler = (data: Buffer) => {
                lastDataTime = Date.now();
                answer.push(data);
                
                // First, check for completion in non-binary response formats
                // This is the standard case for most commands
                if (!cmd.startsWith(GCodes.CmdGetThumbnail)) {
                    // For text commands, we need a complete buffer to check for "ok"
                    const fullBufferSoFar = Buffer.concat(answer);
                    const dataSoFar = fullBufferSoFar.toString('ascii');
                    
                    // For M661 file list command
                    if (cmd === GCodes.CmdListLocalFiles && dataSoFar.includes("ok")) {
                        clearTimeout(timeoutId); // Clear the main timeout
                        setTimeout(() => {
                            cleanup(true); // Resolve after the short delay
                        }, 500); // Wait 500ms
                        return; // Prevent immediate cleanup
                    }
                    
                    // For all other standard text commands
                    if (dataSoFar.includes("ok")) {
                        clearTimeout(timeoutId);
                        cleanup(true);
                        return;
                    }
                }
                // Special case for M662 (thumbnail) command which returns binary data
                else {
                    // For binary responses, only check the text portion for "ok"
                    // Look only at the beginning of the buffer for the text header
                    try {
                        // Just check for "ok" in the first 100 bytes
                        const headerBuffer = Buffer.concat(answer).slice(0, 100);
                        const header = headerBuffer.toString('ascii');
                        
                        if (header.includes("ok")) {
                            // For thumbnail requests, wait longer after "ok" to ensure we get all binary data
                            clearTimeout(timeoutId);
                            setTimeout(() => {
                                cleanup(true);
                            }, 1500); // Wait 1.5s for binary data
                            return;
                        }
                    } catch (e) {
                        console.log("Error checking binary response header: " + e);
                    }
                }
            };

            const errorHandler = (err: Error) => {
                console.error("Error receiving multi-line command reply:", err);
                clearTimeout(timeoutId);
                cleanup(false, err);
            };

            const cleanup = (success: boolean, error?: Error) => {
                // Remove our listeners properly
                this.socket!.removeListener('data', dataHandler);
                this.socket!.removeListener('error', errorHandler);

                if (!success) {
                    console.error("Failed to receive complete response:", error?.message);
                    resolve(null);
                    return;
                }

                // For binary responses (M662), return the raw buffer as a binary string
                if (cmd.startsWith(GCodes.CmdGetThumbnail)) {
                    const result = Buffer.concat(answer).toString('binary');
                    if (!result) {
                        console.error("Received empty thumbnail response.");
                        resolve(null);
                    } else {
                        resolve(result);
                    }
                } else {
                    // For text responses, convert to UTF-8
                    const result = Buffer.concat(answer).toString('utf8');
                    if (!result) {
                        console.error("ReceiveMultiLineReplayAsync received an empty response.");
                        resolve(null);
                    } else {
                        resolve(result);
                    }
                }
            };

            let timeoutDuration = 5000; // default timeout
            if (cmd === GCodes.CmdListLocalFiles || cmd.startsWith(GCodes.CmdGetThumbnail)) { timeoutDuration = 10000; } // increase command timeout
            if (this.socket) { this.socket.setTimeout(timeoutDuration); }
            
            timeoutId = setTimeout(() => {
                console.error(`ReceiveMultiLineReplayAsync timed out after ${timeoutDuration}ms`);
                cleanup(false);
            }, timeoutDuration);

            // Add listeners
            this.socket!.on('data', dataHandler);
            this.socket!.on('error', errorHandler);
        });
    }

    public async getFileListAsync(): Promise<string[]> {
        const response = await this.sendCommandAsync(GCodes.CmdListLocalFiles);
        if (response) {
            return this.parseFileListResponse(response);
        }

        return [];
    }

    /**
     * Parses the file list response from the 3D printer
     * Handles various delimiter patterns and special characters
     */
    private parseFileListResponse(response: string): string[] {
        // Identify data section using various marker patterns
        const startMarkers = [/D[\S\*]+D\{\:\:/, /D.*?D\{/, /CMD.*?D\{/];
        let dataSection = response;

        // Try to find the start of the data section
        for (const markerPattern of startMarkers) {
            const match = response.match(markerPattern);
            if (match) {
                // @ts-ignore
                dataSection = response.substring(match.index + match[0].length);
                break;
            }
        }

        // Normalize all delimiters - replace different patterns with a standard delimiter
        const normalizedData = dataSection
            .replace(/\:\:\#\#/g, "||")  // Replace ::## with ||
            .replace(/\:\:\S\S/g, "||")  // Replace ::�� and similar with ||
            .replace(/\:\:/g, "||");     // Replace :: with ||

        // Split by the normalized delimiter
        const parts = normalizedData.split("||").filter(Boolean);

        // Extract file paths
        const files: string[] = [];
        for (const part of parts) {
            // Look for complete paths starting with /data/ until a delimiter is encountered
            const match = part.match(/\/data\/([^|"\r\n\s]+)/i);
            if (match && match[1]) {
                const fileName = match[1].trim();
                // Filter for supported file types with any combination of extensions
                if (fileName && /\.(3mf|gcode|gcode\.gx|gx|stl|obj)$/i.test(fileName)) { files.push(fileName); }
            }
        }

        // Remove duplicates
        return [...new Set(files)];
    }

    public dispose(): void {
        try {
            console.log("TcpPrinterClient closing socket");
            if (this.socket) {
                this.socket.destroy();
                this.socket = null;
            }
        } catch (error: unknown) {
            const err = error as Error;
            console.log(err.message);
        }
    }
}