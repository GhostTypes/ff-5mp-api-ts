/**
 * @fileoverview Low-level TCP socket client for FlashForge printers, managing connections,
 * command serialization, multi-line response parsing, and keep-alive mechanisms.
 */
import * as net from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { GCodes } from './client/GCodes';
export class FlashForgeTcpClient {
  /** The underlying network socket for TCP communication. Null if not connected. */
  protected socket: net.Socket | null = null;
  /** The default TCP port used for connecting to FlashForge printers. */
  protected readonly port = 8899;
  /** The default timeout (in milliseconds) for socket operations. */
  protected readonly timeout = 5000;
  /** The hostname or IP address of the printer. */
  protected hostname: string;
  /** Token to signal cancellation of the keep-alive loop. */
  private keepAliveCancellationToken: boolean = false;
  /** Counter for consecutive keep-alive errors. */
  private keepAliveErrors: number = 0;
  /** Flag indicating if the socket is currently busy sending a command and awaiting a response. */
  private socketBusy: boolean = false;

  /**
   * Creates an instance of FlashForgeTcpClient.
   * Initializes the hostname and attempts to connect to the printer.
   * @param hostname The IP address or hostname of the FlashForge printer.
   */
  constructor(hostname: string) {
    this.hostname = hostname;
    try {
      console.log('TcpPrinterClient creation');
      this.connect();
      console.log('Connected');
    } catch (_error: unknown) {
      console.log('TcpPrinterClient failed to init!!!');
    }
  }

  /**
   * Starts a keep-alive mechanism to maintain the TCP connection with the printer.
   * Periodically sends a status command (`GCodes.CmdPrintStatus`) to the printer.
   * Adjusts the keep-alive interval based on error counts.
   * This method runs asynchronously and will continue until `stopKeepAlive` is called
   * or too many consecutive errors occur.
   */
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
        console.log(`KeepAlive encountered an exception: ${err.message}`);
      }
    };

    runKeepAlive();
  }

  /**
   * Stops the keep-alive mechanism.
   * @param logout If true, sends a logout command to the printer before stopping. Defaults to false.
   */
  public stopKeepAlive(logout: boolean = false): void {
    if (logout) {
      this.sendCommandAsync(GCodes.CmdLogout).then(() => {
        // Ignore: Logout errors during disposal are acceptable
      });
    } // release control
    this.keepAliveCancellationToken = true;
    console.log('Keep-alive stopped.');
  }

  /**
   * Checks if the socket is currently busy processing a command.
   * @returns A Promise that resolves to true if the socket is busy, false otherwise.
   */
  public async isSocketBusy(): Promise<boolean> {
    return this.socketBusy;
  }

  /**
   * Sends a command string to the printer asynchronously via the TCP socket.
   * It ensures the socket is available, writes the command (appending a newline),
   * and then waits to receive a multi-line reply.
   * Handles socket busy state and various connection errors.
   *
   * @param cmd The command string to send (e.g., "~M115").
   * @returns A Promise that resolves to the printer's string reply, or null if an error occurs,
   *          the reply is invalid, or the connection needs to be reset.
   */
  public async sendCommandAsync(cmd: string): Promise<string | null> {
    if (this.socketBusy) {
      await this.waitUntilSocketAvailable();
    }

    this.socketBusy = true;

    console.log(`sendCommand: ${cmd}`);
    try {
      this.checkSocket();

      return new Promise<string | null>((resolve, reject) => {
        this.socket?.write(`${cmd}\n`, 'ascii', (err) => {
          if (err) {
            this.socketBusy = false;
            console.error('Error writing command to socket:', err);
            reject(err);
            return;
          }

          this.receiveMultiLineReplayAsync(cmd)
            .then((reply) => {
              this.socketBusy = false;
              if (reply !== null) {
                //console.log("Received reply for command:", reply);
                resolve(reply);
              } else {
                console.warn('Invalid or no reply received, resetting connection to printer.');
                this.resetSocket();
                this.checkSocket();
                resolve(null);
              }
            })
            .catch((error) => {
              this.socketBusy = false;
              console.error('Error receiving reply:', error);
              reject(error);
            });
        });
      });
    } catch (error: unknown) {
      this.socketBusy = false;
      const err = error as { code?: string; message: string; stack: string };

      if (err.code === 'ENETUNREACH') {
        const errMsg = `Error while connecting. No route to host [${this.hostname}].`;
        console.error(`${errMsg}\n${err.stack}`);
      } else if (err.code === 'ENOTFOUND') {
        const errMsg = `Error while connecting. Unknown host [${this.hostname}].`;
        console.error(`${errMsg}\n${err.stack}`);
      } else {
        console.error(`Error while sending command: ${err.message}\n${err.stack}`);
      }
      return null;
    }
  }

  /**
   * Waits until the socket is no longer busy or a timeout is reached.
   * This is used to serialize commands sent over the socket.
   * @throws Error if the socket remains busy for too long (10 seconds).
   * @private
   */
  private async waitUntilSocketAvailable(): Promise<void> {
    const maxWaitTime = 10000; // 10 seconds
    const startTime = Date.now();

    while (this.socketBusy && Date.now() - startTime < maxWaitTime) {
      await sleep(100);
    }

    if (this.socketBusy) {
      throw new Error('Socket remained busy for too long, timing out');
    }
  }

  /**
   * Checks the status of the socket connection and attempts to reconnect if it's null or destroyed.
   * If reconnection occurs, it also restarts the keep-alive mechanism.
   * @private
   */
  private checkSocket(): void {
    console.log('CheckSocket()');
    let fix = false;
    if (this.socket === null) {
      fix = true;
      //console.warn("TcpPrinterClient socket is null");
    } else if (this.socket.destroyed) {
      fix = true;
      //console.warn("TcpPrinterClient socket is closed");
    }

    if (!fix) return;

    console.warn('Reconnecting to TCP socket...');
    this.connect();
    this.startKeepAlive(); // Start this here rather than Connect()
  }

  /**
   * Establishes a TCP connection to the printer.
   * Initializes the socket, sets the timeout, and sets up an error handler.
   * @private
   */
  private connect(): void {
    //console.log("Connect()");
    this.socket = new net.Socket();
    this.socket.connect(this.port, this.hostname);
    this.socket.setTimeout(this.timeout);

    this.socket.on('error', (error) => {
      console.log(`Socket error: ${error.message}`);
    });
  }

  /**
   * Resets the current socket connection.
   * Stops the keep-alive mechanism and destroys the socket.
   * @private
   */
  private resetSocket(): void {
    //console.log("ResetSocket()");
    this.stopKeepAlive();
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }

  /**
   * Asynchronously receives a multi-line reply from the printer for a given command.
   * It listens for 'data' events on the socket, concatenates incoming data buffers,
   * and determines when the full reply has been received based on command-specific delimiters
   * (usually "ok" for text commands, or specific logic for binary data like thumbnails).
   * Handles timeouts and errors during reception.
   *
   * @param cmd The command string for which the reply is expected. This influences how completion is detected.
   * @returns A Promise that resolves to the complete string reply from the printer,
   *          or null if an error occurs, the reply is incomplete, or a timeout happens.
   *          For thumbnail commands (M662), the response is a binary string.
   * @private
   */
  private async receiveMultiLineReplayAsync(cmd: string): Promise<string | null> {
    //console.log("ReceiveMultiLineReplayAsync()");

    if (!this.socket) {
      //console.error("Socket is null, cannot receive reply.");
      return null;
    }

    return new Promise<string | null>((resolve) => {
      const answer: Buffer[] = [];
      let timeoutId: NodeJS.Timeout;
      let _lastDataTime = Date.now();

      // Create our handler functions
      const dataHandler = (data: Buffer) => {
        _lastDataTime = Date.now();
        answer.push(data);

        // First, check for completion in non-binary response formats
        // This is the standard case for most commands
        if (!cmd.startsWith(GCodes.CmdGetThumbnail)) {
          // For text commands, we need a complete buffer to check for "ok"
          const fullBufferSoFar = Buffer.concat(answer);
          const dataSoFar = fullBufferSoFar.toString('ascii');

          // For M661 file list command
          if (cmd === GCodes.CmdListLocalFiles && dataSoFar.includes('ok')) {
            clearTimeout(timeoutId); // Clear the main timeout
            setTimeout(() => {
              cleanup(true); // Resolve after the short delay
            }, 500); // Wait 500ms
            return; // Prevent immediate cleanup
          }

          // For all other standard text commands
          if (dataSoFar.includes('ok')) {
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

            if (header.includes('ok')) {
              // For thumbnail requests, wait longer after "ok" to ensure we get all binary data
              clearTimeout(timeoutId);
              setTimeout(() => {
                cleanup(true);
              }, 1500); // Wait 1.5s for binary data
              return;
            }
          } catch (e) {
            console.log(`Error checking binary response header: ${e}`);
          }
        }
      };

      const errorHandler = (err: Error) => {
        console.error('Error receiving multi-line command reply:', err);
        clearTimeout(timeoutId);
        cleanup(false, err);
      };

      const cleanup = (success: boolean, error?: Error) => {
        // Remove our listeners properly
        this.socket?.removeListener('data', dataHandler);
        this.socket?.removeListener('error', errorHandler);

        if (!success) {
          console.error('Failed to receive complete response:', error?.message);
          resolve(null);
          return;
        }

        // For binary responses (M662), return the raw buffer as a binary string
        if (cmd.startsWith(GCodes.CmdGetThumbnail)) {
          const result = Buffer.concat(answer).toString('binary');
          if (!result) {
            console.error('Received empty thumbnail response.');
            resolve(null);
          } else {
            resolve(result);
          }
        } else {
          // For text responses, convert to UTF-8
          const result = Buffer.concat(answer).toString('utf8');
          if (!result) {
            console.error('ReceiveMultiLineReplayAsync received an empty response.');
            resolve(null);
          } else {
            resolve(result);
          }
        }
      };

      let timeoutDuration = 5000; // default timeout
      if (cmd === GCodes.CmdListLocalFiles || cmd.startsWith(GCodes.CmdGetThumbnail)) {
        timeoutDuration = 10000;
      } // increase command timeout
      if (cmd === GCodes.CmdHomeAxes || cmd === '~G28') {
        timeoutDuration = 15000;
      } // homing takes longer
      if (this.socket) {
        this.socket.setTimeout(timeoutDuration);
      }

      timeoutId = setTimeout(() => {
        console.error(`ReceiveMultiLineReplayAsync timed out after ${timeoutDuration}ms`);
        cleanup(false);
      }, timeoutDuration);

      // Add listeners
      this.socket?.on('data', dataHandler);
      this.socket?.on('error', errorHandler);
    });
  }

  /**
   * Retrieves a list of G-code files stored on the printer's local storage.
   * Sends the `GCodes.CmdListLocalFiles` (M661) command and parses the response.
   * @returns A Promise that resolves to an array of file names (strings, without '/data/' prefix).
   *          Returns an empty array if the command fails or no files are found.
   */
  public async getFileListAsync(): Promise<string[]> {
    const response = await this.sendCommandAsync(GCodes.CmdListLocalFiles);
    if (response) {
      return this.parseFileListResponse(response);
    }

    return [];
  }

  /**
   * Parses the raw string response from the `M661` (list files) command.
   * The response format typically includes segments separated by "::", with file paths
   * prefixed by "/data/". This method extracts and cleans these file names.
   * @param response The raw string response from the M661 command.
   * @returns An array of file names, with the "/data/" prefix removed and any trailing invalid characters trimmed.
   * @private
   */
  private parseFileListResponse(response: string): string[] {
    const segments = response.split('::');

    // Extract file paths
    const filePaths: string[] = [];
    for (const segment of segments) {
      const dataIndex = segment.indexOf('/data/');
      if (dataIndex !== -1) {
        const fullPath = segment.substring(dataIndex);
        if (fullPath.startsWith('/data/')) {
          let filename = fullPath.substring(6);

          // Trim at the first invalid character (if any)
          const invalidCharIndex = filename.search(/[^\w\s\-.()+%,@[\]{}:;!#$^&*=<>?/]/);
          if (invalidCharIndex !== -1) {
            filename = filename.substring(0, invalidCharIndex);
          }

          // Only add non-empty filenames
          if (filename.trim().length > 0) {
            filePaths.push(filename);
          }
        }
      }
    }

    return filePaths;
  }

  /**
   * Cleans up resources by destroying the socket connection.
   * This should be called when the client is no longer needed.
   */
  public async dispose(): Promise<void> {
    try {
      console.log('TcpPrinterClient closing socket');

      // First stop the keep-alive loop
      this.keepAliveCancellationToken = true;

      // Send logout command if socket is available and not busy
      if (this.socket && !this.socket.destroyed && !this.socketBusy) {
        try {
          await this.sendCommandAsync(GCodes.CmdLogout);
        } catch (_error) {
          // Logout errors during disposal are acceptable - the socket cleanup must complete regardless
        }
      }

      // Now destroy the socket
      if (this.socket) {
        this.socket.destroy();
        this.socket = null;
      }

      console.log('Keep-alive stopped.');
    } catch (error: unknown) {
      const err = error as Error;
      console.log(err.message);
    }
  }
}
