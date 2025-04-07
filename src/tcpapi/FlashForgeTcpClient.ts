// src/tcpapi/FlashForgeTcpClient.ts
import * as net from 'net';
import { setTimeout as sleep } from 'timers/promises';

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
                    console.log("KeepAlive");
                    const result = await this.sendCommandAsync("~M27");
                    if (result === null) {
                        // keep alive failed, connection error/timeout etc
                        this.keepAliveErrors++; // keep track of errors
                        console.log(`Current keep alive failure: ${this.keepAliveErrors}`);
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

        runKeepAlive();
    }

    public stopKeepAlive(logout: boolean = false): void {
        if (logout) {
            this.sendCommandAsync("~M602").then(() => {});
        }
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
                        reject(err);
                        return;
                    }

                    this.receiveMultiLineReplayAsync(cmd)
                        .then(reply => {
                            this.socketBusy = false;
                            if (reply !== null) {
                                resolve(reply);
                            } else {
                                console.log("Invalid or no replay received, resetting connection to printer.");
                                this.resetSocket();
                                this.checkSocket();
                                resolve(null);
                            }
                        })
                        .catch(error => {
                            this.socketBusy = false;
                            reject(error);
                        });
                });
            });
        } catch (error: unknown) {
            this.socketBusy = false;
            const err = error as { code?: string, message: string, stack: string };

            if (err.code === 'ENETUNREACH') {
                const errMsg = `Error while connecting. No route to host [${this.hostname}].`;
                console.log(errMsg + "\n" + err.stack);
            } else if (err.code === 'ENOTFOUND') {
                const errMsg = `Error while connecting. Unknown host [${this.hostname}].`;
                console.log(errMsg + "\n" + err.stack);
            } else {
                console.log(`Error while sending command: ${err.message}\n${err.stack}`);
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
            console.log("TcpPrinterClient socket is null");
        } else if (this.socket.destroyed) {
            fix = true;
            console.log("TcpPrinterClient socket is closed");
        }

        if (!fix) return;

        console.log("Reconnecting to socket...");
        this.connect();
        this.startKeepAlive(); // Start this here rather than Connect()
    }

    private connect(): void {
        console.log("Connect()");
        this.socket = new net.Socket();
        this.socket.connect(this.port, this.hostname);
        this.socket.setTimeout(this.timeout);

        this.socket.on('error', (error) => {
            console.log(`Socket error: ${error.message}`);
        });
    }

    private resetSocket(): void {
        console.log("ResetSocket()");
        this.stopKeepAlive();
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
    }

    private async receiveMultiLineReplayAsync(cmd: string): Promise<string | null> {
        console.log("ReceiveMultiLineReplayAsync()");

        if (!this.socket) {
            return null;
        }

        return new Promise<string | null>((resolve) => {
            const answer: Buffer[] = [];
            let timeoutId: NodeJS.Timeout;

            // Create our handler functions
            const dataHandler = (data: Buffer) => {
                answer.push(data);
                const dataSoFar = Buffer.concat(answer).toString('ascii');

                if ((cmd === "~M661" && dataSoFar.includes("~M662")) ||
                    (cmd !== "~M661" && dataSoFar.includes("ok"))) {
                    clearTimeout(timeoutId);

                    // Remove our listeners properly
                    this.socket!.removeListener('data', dataHandler);
                    this.socket!.removeListener('error', errorHandler);

                    const result = Buffer.concat(answer).toString('utf8');
                    if (!result) {
                        console.log("ReceiveMultiLineReplayAsync received an empty response.");
                        resolve(null);
                    } else {
                        console.log("Multi-line replay received:\n" + result);
                        resolve(result);
                    }
                }
            };

            const errorHandler = (err: Error) => {
                console.log("Error receiving multi-line command reply");
                console.log(err.stack);
                clearTimeout(timeoutId);

                // Remove our listeners properly
                this.socket!.removeListener('data', dataHandler);
                this.socket!.removeListener('error', errorHandler);

                resolve(null);
            };

            // Set up the timeout
            timeoutId = setTimeout(() => {
                console.log("ReceiveMultiLineReplayAsync timed out.");

                // Remove our listeners properly
                this.socket!.removeListener('data', dataHandler);
                this.socket!.removeListener('error', errorHandler);

                resolve(null);
            }, 5000);

            // Add our listeners
            this.socket!.on('data', dataHandler);
            this.socket!.on('error', errorHandler);
        });
    }

    public async getFileListAsync(): Promise<string[]> {
        const response = await this.sendCommandAsync("~M661");
        if (response) {
            return this.parseFileListResponse(response);
        }
        console.log("No response received for M661 command.");
        return [];
    }

    private parseFileListResponse(response: string): string[] {
        const entries = response.split('::').filter(entry => entry.trim() !== '');

        return entries
            .map(entry => entry.trim())
            .filter(trimmedEntry => {
                const dataIndex = trimmedEntry.toLowerCase().indexOf('/data/');
                return dataIndex >= 0;
            })
            .map(filePath => {
                // Extract path after /data/
                const dataIndex = filePath.toLowerCase().indexOf('/data/');
                const extractedPath = filePath.substring(dataIndex);

                // Remove non-printable characters
                const cleanPath = extractedPath.replace(/[^\x20-\x7E]/g, '');

                // Replace /data/ with empty string
                return cleanPath.replace('/data/', '');
            })
            .filter(filePath => filePath !== '');
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