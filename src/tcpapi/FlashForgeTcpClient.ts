/**
 * @fileoverview Low-level TCP socket client for FlashForge printers, managing connections,
 * command serialization, multi-line response parsing, and keep-alive mechanisms.
 */
import { createReadStream, promises as fs } from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
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
          if (this.socketBusy) {
            await sleep(250);
            continue;
          }

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

    try {
      return await this.sendCommandWithLockedSocket(cmd);
    } finally {
      this.socketBusy = false;
    }
  }

  /**
   * Uploads a file to legacy printer storage using the documented M28/raw-binary/M29 flow.
   * The file is stored in the printer's `/data/` directory using a normalized filename.
   *
   * @param localFilePath Absolute or relative path to the local file to upload.
   * @param remoteFileName Optional target filename. Legacy prefixes such as `0:/user/` or `/data/`
   * are normalized automatically.
   * @returns True when the printer accepts the upload and finalizes it successfully.
   */
  public async uploadFile(localFilePath: string, remoteFileName?: string): Promise<boolean> {
    let stats: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stats = await fs.stat(localFilePath);
    } catch (error) {
      console.error(
        `Upload failed: unable to access file ${localFilePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }

    if (!stats.isFile()) {
      console.error(`Upload failed: ${localFilePath} is not a file.`);
      return false;
    }

    const normalizedFileName = this.normalizeLegacyUploadFilename(
      remoteFileName ?? localFilePath
    );
    if (!normalizedFileName) {
      console.error('Upload failed: remote file name resolved to an empty value.');
      return false;
    }

    const startCommand = GCodes.CmdPrepFileUpload
      .replace('%%size%%', stats.size.toString())
      .replace('%%filename%%', normalizedFileName);

    if (this.socketBusy) {
      await this.waitUntilSocketAvailable(30000);
    }

    this.socketBusy = true;
    try {
      const startResponse = await this.sendCommandWithLockedSocket(startCommand);
      if (!startResponse || !this.isSuccessfulUploadBoundaryResponse(startCommand, startResponse)) {
        console.error('Upload failed: printer rejected M28 upload initialization.');
        return false;
      }

      for await (const chunk of createReadStream(localFilePath)) {
        await this.writeSocketData(chunk);
      }

      const finishResponse = await this.sendCommandWithLockedSocket(
        GCodes.CmdCompleteFileUpload,
        false
      );
      if (!finishResponse) {
        console.error('Upload failed: printer did not respond to M29 upload finalization.');
        return false;
      }

      return this.isSuccessfulUploadBoundaryResponse(GCodes.CmdCompleteFileUpload, finishResponse);
    } catch (error: unknown) {
      console.error(
        `Upload failed for ${normalizedFileName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      this.resetSocket();
      return false;
    } finally {
      this.socketBusy = false;
    }
  }

  /**
   * Waits until the socket is no longer busy or a timeout is reached.
   * This is used to serialize commands sent over the socket.
   * @throws Error if the socket remains busy for too long (10 seconds by default).
   * @private
   */
  private async waitUntilSocketAvailable(maxWaitTime: number = 10000): Promise<void> {
    const startTime = Date.now();

    while (this.socketBusy && Date.now() - startTime < maxWaitTime) {
      await sleep(100);
    }

    if (this.socketBusy) {
      throw new Error('Socket remained busy for too long, timing out');
    }
  }

  private async sendCommandWithLockedSocket(
    cmd: string,
    allowReconnect: boolean = true
  ): Promise<string | null> {
    console.log(`sendCommand: ${cmd}`);
    try {
      if (allowReconnect) {
        this.checkSocket();
      } else if (!this.socket || this.socket.destroyed) {
        console.error('Error while sending command: socket is unavailable.');
        return null;
      }

      return await new Promise<string | null>((resolve, reject) => {
        this.socket?.write(`${cmd}\n`, 'ascii', (err) => {
          if (err) {
            console.error('Error writing command to socket:', err);
            reject(err);
            return;
          }

          if (this.shouldSkipResponseWait(cmd)) {
            resolve('');
            return;
          }

          this.receiveMultiLineReplayAsync(cmd)
            .then((reply) => {
              if (reply !== null) {
                resolve(reply);
              } else {
                console.warn('Invalid or no reply received, resetting connection to printer.');
                this.resetSocket();
                if (allowReconnect) {
                  this.checkSocket();
                }
                resolve(null);
              }
            })
            .catch((error) => {
              console.error('Error receiving reply:', error);
              reject(error);
            });
        });
      });
    } catch (error: unknown) {
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
      let settleTimeoutId: NodeJS.Timeout | null = null;
      let _lastDataTime = Date.now();

      const queueCleanup = (binary: boolean) => {
        if (settleTimeoutId) clearTimeout(settleTimeoutId);
        const delay = this.getResponseCompletionDelayMs(cmd, binary);
        if (delay === 0) {
          cleanup(true);
          return;
        }

        settleTimeoutId = setTimeout(() => {
          settleTimeoutId = null;
          cleanup(true);
        }, delay);
      };

      // Create our handler functions
      const dataHandler = (data: Buffer) => {
        _lastDataTime = Date.now();
        answer.push(data);

        // First, check for completion in non-binary response formats
        // This is the standard case for most commands
        if (!this.isBinaryCommand(cmd)) {
          const fullBufferSoFar = Buffer.concat(answer);
          const dataSoFar = fullBufferSoFar.toString('ascii');

          if (this.isTextResponseComplete(cmd, dataSoFar)) {
            clearTimeout(timeoutId);
            queueCleanup(false);
            return;
          }

          if (this.shouldUseInactivityCompletion(cmd)) {
            if (settleTimeoutId) clearTimeout(settleTimeoutId);
            settleTimeoutId = setTimeout(() => {
              clearTimeout(timeoutId);
              cleanup(true);
            }, this.getInactivityCompletionDelayMs(cmd));
          }
        } else {
          const fullBufferSoFar = Buffer.concat(answer);
          if (this.isBinaryResponseComplete(cmd, fullBufferSoFar)) {
            clearTimeout(timeoutId);
            queueCleanup(true);
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
        if (settleTimeoutId) {
          clearTimeout(settleTimeoutId);
          settleTimeoutId = null;
        }

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
          const result = this.normalizeTextResponse(
            cmd,
            Buffer.concat(answer).toString('utf8')
          );
          if (!result) {
            console.error('ReceiveMultiLineReplayAsync received an empty response.');
            resolve(null);
          } else {
            resolve(result);
          }
        }
      };

      const timeoutDuration = this.getCommandTimeoutMs(cmd);
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
   * Determines whether a command should return immediately after it is written to the socket.
   * Override in subclasses for fire-and-forget protocols.
   */
  protected shouldSkipResponseWait(_cmd: string): boolean {
    return false;
  }

  /**
   * Determines whether a command returns binary payload data.
   * Thumbnail retrieval is the only binary command currently supported.
   */
  protected isBinaryCommand(cmd: string): boolean {
    return cmd.startsWith(GCodes.CmdGetThumbnail);
  }

  /**
   * Determines when a text response is complete.
   * The default FlashForge protocol terminates command replies with `ok`.
   */
  protected isTextResponseComplete(_cmd: string, response: string): boolean {
    return response.includes('ok');
  }

  /**
   * Determines whether a command should finish after a short quiet period even without `ok`.
   * Adventurer 3 overrides this for commands such as M115 and M119.
   */
  protected shouldUseInactivityCompletion(_cmd: string): boolean {
    return this.isLegacyUploadBoundaryCommand(_cmd);
  }

  /**
   * Delay used for inactivity-based completion.
   */
  protected getInactivityCompletionDelayMs(cmd: string): number {
    if (this.isLegacyUploadBoundaryCommand(cmd)) {
      return 250;
    }
    return 200;
  }

  /**
   * Delay added after the completion marker is seen to allow trailing data to arrive.
   */
  protected getResponseCompletionDelayMs(cmd: string, binary: boolean): number {
    if (binary) return 1500;
    if (cmd === GCodes.CmdListLocalFiles) return 500;
    return 0;
  }

  /**
   * Determines whether a binary response buffer is complete.
   * The default behavior waits for `ok` in the leading header bytes.
   */
  protected isBinaryResponseComplete(_cmd: string, response: Buffer): boolean {
    try {
      const header = response.subarray(0, 100).toString('ascii');
      return header.includes('ok');
    } catch (error) {
      console.log(`Error checking binary response header: ${error}`);
      return false;
    }
  }

  /**
   * Normalizes a text response before it is returned to callers.
   * Subclasses can strip model-specific transport wrappers here.
   */
  protected normalizeTextResponse(_cmd: string, response: string): string {
    return response;
  }

  /**
   * Returns the socket timeout to use for a given command.
   */
  protected getCommandTimeoutMs(cmd: string): number {
    if (cmd === GCodes.CmdListLocalFiles || this.isBinaryCommand(cmd)) {
      return 10000;
    }
    if (this.isLegacyUploadBoundaryCommand(cmd)) {
      return 10000;
    }
    if (cmd === GCodes.CmdHomeAxes || cmd === '~G28') {
      return 15000;
    }
    return 5000;
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

  private async writeSocketData(data: Buffer | string): Promise<void> {
    if (!this.socket || this.socket.destroyed) {
      throw new Error('Socket is unavailable for raw upload data.');
    }

    await new Promise<void>((resolve, reject) => {
      if (Buffer.isBuffer(data)) {
        this.socket?.write(data, (err) => {
          if (err) {
            reject(err);
            return;
          }

          resolve();
        });
        return;
      }

      this.socket?.write(data, 'ascii', (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  private normalizeLegacyUploadFilename(fileName: string): string {
    const normalizedPath = fileName.replace(/\\/g, '/');
    const withoutLegacyPrefix = normalizedPath
      .replace(/^0:\/user\//i, '')
      .replace(/^\/data\//i, '');

    return path.posix.basename(withoutLegacyPrefix);
  }

  private isLegacyUploadBoundaryCommand(cmd: string): boolean {
    return /^~?M28\b/i.test(cmd.trim()) || /^~?M29\b/i.test(cmd.trim());
  }

  private isSuccessfulUploadBoundaryResponse(cmd: string, response: string): boolean {
    const normalized = response.replace(/\r\n/g, '\n').trim();
    if (!normalized) {
      return false;
    }

    if (
      /error:|control failed\.|file is not available|cannot create file|not enough space/i.test(
        normalized
      )
    ) {
      return false;
    }

    const bareCommand = cmd.trim().replace(/^~/, '').split(/\s+/, 1)[0];
    return (
      normalized.includes('ok') ||
      normalized.includes('Received.') ||
      new RegExp(`\\b${bareCommand}\\b`, 'i').test(normalized)
    );
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
