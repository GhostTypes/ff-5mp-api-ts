/**
 * @fileoverview TCP client for FlashForge Adventurer 3 printers.
 *
 * Adventurer 3 uses a text-based TCP protocol on port 8899 with `~`-prefixed commands.
 * Responses may be wrapped with `ack:` or `echo:` and several commands do not include
 * a trailing `ok`, so this client normalizes transport responses before parsing them.
 */

import { GCodes } from './client/GCodes';
import { FlashForgeTcpClient } from './FlashForgeTcpClient';
import { EndstopStatus } from './replays/EndstopStatus';
import { LocationInfo } from './replays/LocationInfo';
import { PrintStatus } from './replays/PrintStatus';
import { TempInfo } from './replays/TempInfo';

export interface A3BuildVolume {
  x: number;
  y: number;
  z: number;
}

/**
 * Printer information returned by M115.
 */
export interface A3PrinterInfo {
  /** Machine type/model name, e.g. "FlashForge Adventurer III". */
  machineType: string;
  /** User-assigned printer name. */
  machineName: string;
  /** Firmware version, e.g. "v1.3.7". */
  firmware: string;
  /** Printer serial number. */
  serialNumber: string;
  /** Advertised build volume in mm. */
  buildVolume: A3BuildVolume;
  /** Number of tools/extruders. */
  toolCount: number;
  /** Network MAC address. */
  macAddress: string;
  /** Raw normalized response string. */
  raw: string;
}

/**
 * File entry from M661 list command.
 */
export interface A3FileEntry {
  /** File name without path prefix. */
  name: string;
  /** Full path on printer storage. */
  path: string;
  /** File size in bytes if known. */
  size?: number;
}

/**
 * Thumbnail data from M662.
 */
export interface A3Thumbnail {
  /** PNG image data. */
  data: Buffer;
  /** Image width if available from parsing. */
  width?: number;
  /** Image height if available from parsing. */
  height?: number;
}

/**
 * TCP client for FlashForge Adventurer 3 printers.
 */
export class FlashForgeA3Client extends FlashForgeTcpClient {
  /** The Adventurer 3 TCP port. */
  protected override readonly port = 8899;

  protected override shouldSkipResponseWait(cmd: string): boolean {
    const bareCmd = this.stripProtocolPrefix(cmd);
    return /^(G1|G28|G90|G91|G92)\b/.test(bareCmd);
  }

  protected override shouldUseInactivityCompletion(cmd: string): boolean {
    return !this.isBinaryCommand(cmd) && !this.shouldSkipResponseWait(cmd);
  }

  protected override getInactivityCompletionDelayMs(cmd: string): number {
    const bareCmd = this.stripProtocolPrefix(cmd);
    if (bareCmd.startsWith('M661')) return 500;
    if (bareCmd.startsWith('M115') || bareCmd.startsWith('M119') || bareCmd.startsWith('M650')) {
      return 250;
    }
    return 200;
  }

  protected override getResponseCompletionDelayMs(cmd: string, binary: boolean): number {
    if (binary && this.stripProtocolPrefix(cmd).startsWith('M662')) return 0;
    return super.getResponseCompletionDelayMs(cmd, binary);
  }

  protected override isBinaryResponseComplete(cmd: string, response: Buffer): boolean {
    if (!this.stripProtocolPrefix(cmd).startsWith('M662')) {
      return super.isBinaryResponseComplete(cmd, response);
    }

    const textPrefix = response.toString('utf8');
    if (textPrefix.includes('Error: File not exists')) {
      return true;
    }

    const magicOffset = response.indexOf(Buffer.from([0xa2, 0xa2, 0x2a, 0x2a]));
    if (magicOffset === -1 || response.length < magicOffset + 8) {
      return false;
    }

    const length = response.readUInt32BE(magicOffset + 4);
    return response.length >= magicOffset + 8 + length;
  }

  protected override normalizeTextResponse(_cmd: string, response: string): string {
    return this.normalizeA3TextResponse(response);
  }

  /**
   * Initializes control by sending the legacy M601 S1 login command.
   */
  public async initControl(): Promise<boolean> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const loginCommand = GCodes.CmdLogin;
      const response = await this.sendCommandAsync(loginCommand);
      if (response === null) {
        console.error('A3: Failed to send M601 S1 login command');
        return false;
      }

      if (response.includes('Error: have been connected')) {
        console.warn('A3: Already connected to printer');
        return true;
      }

      return this.isSuccessfulCommandResponse(loginCommand, response);
    } catch (error) {
      console.error('A3: initControl error:', error);
      return false;
    }
  }

  /**
   * Gets printer information using M115.
   */
  public async getPrinterInfo(): Promise<A3PrinterInfo | null> {
    const response = await this.sendCommandAsync('~M115');
    if (response === null) return null;

    const normalized = this.normalizeA3TextResponse(response);
    const lines = this.getNormalizedLines(normalized);
    const info: A3PrinterInfo = {
      machineType: '',
      machineName: '',
      firmware: '',
      serialNumber: '',
      buildVolume: { x: 150, y: 150, z: 150 },
      toolCount: 1,
      macAddress: '',
      raw: normalized,
    };

    for (const line of lines) {
      if (line.startsWith('Machine Type:')) {
        info.machineType = line.replace('Machine Type:', '').trim();
      } else if (line.startsWith('Machine Name:')) {
        info.machineName = line.replace('Machine Name:', '').trim();
      } else if (line.startsWith('Firmware:')) {
        info.firmware = line.replace('Firmware:', '').trim();
      } else if (line.startsWith('SN:')) {
        info.serialNumber = line.replace('SN:', '').trim();
      } else if (line.startsWith('Serial Number:')) {
        info.serialNumber = line.replace('Serial Number:', '').trim();
      } else if (line.startsWith('Tool Count:')) {
        info.toolCount = parseInt(line.replace('Tool Count:', '').trim(), 10) || 1;
      } else if (line.startsWith('Mac Address:')) {
        info.macAddress = line.replace('Mac Address:', '').trim();
      } else {
        const volumeMatch = line.match(/X:\s*(\d+)\s+Y:\s*(\d+)\s+Z:\s*(\d+)/i);
        if (volumeMatch) {
          info.buildVolume = {
            x: parseInt(volumeMatch[1], 10),
            y: parseInt(volumeMatch[2], 10),
            z: parseInt(volumeMatch[3], 10),
          };
        }
      }
    }

    if (!info.machineType || !info.firmware) {
      return null;
    }

    return info;
  }

  /**
   * Gets endstop and machine status using M119.
   */
  public async getEndstopStatus(): Promise<EndstopStatus | null> {
    const response = await this.sendCommandAsync('~M119');
    if (response === null) return null;

    try {
      return new EndstopStatus().fromReplay(this.normalizeA3TextResponse(response));
    } catch (error) {
      console.error('A3: Failed to parse endstop status:', error);
      return null;
    }
  }

  /**
   * Sets the printer name using M610.
   */
  public async setPrinterName(name: string): Promise<boolean> {
    return await this.sendCmdOk(`~M610 ${name}`);
  }

  /**
   * Lists files from printer storage using M661.
   */
  public async listFiles(): Promise<A3FileEntry[]> {
    const response = await this.sendCommandAsync('~M661');
    if (response === null) return [];

    try {
      return this.parseFileList(response);
    } catch (error) {
      console.error('A3: Failed to parse file list:', error);
      return [];
    }
  }

  /**
   * Gets a file thumbnail using M662.
   */
  public async getThumbnail(filename: string): Promise<A3Thumbnail | null> {
    const response = await this.sendCommandAsync(`~M662 ${filename}`);
    if (response === null) return null;

    try {
      return this.parseThumbnail(response);
    } catch (error) {
      console.error('A3: Failed to parse thumbnail:', error);
      return null;
    }
  }

  /**
   * Selects a file for printing using M23.
   */
  public async selectFile(filename: string): Promise<boolean> {
    const resolvedPath = filename.startsWith('/') ? filename : `/data/${filename}`;
    return await this.sendCmdOk(`~M23 ${resolvedPath}`);
  }

  /**
   * Starts a print job using M24.
   */
  public async startPrint(): Promise<boolean> {
    return await this.sendCmdOk('~M24');
  }

  /**
   * Pauses a print job using M25.
   */
  public async pausePrint(): Promise<boolean> {
    return await this.sendCmdOk('~M25');
  }

  /**
   * Stops a print job using M26.
   */
  public async stopPrint(): Promise<boolean> {
    return await this.sendCmdOk('~M26');
  }

  /**
   * Gets print progress using M27.
   */
  public async getPrintStatus(): Promise<PrintStatus | null> {
    const response = await this.sendCommandAsync('~M27');
    if (response === null) return null;

    try {
      return new PrintStatus().fromReplay(this.normalizeA3TextResponse(response));
    } catch (error) {
      console.error('A3: Failed to parse print status:', error);
      return null;
    }
  }

  /**
   * Gets the current position using M114.
   */
  public async getPosition(): Promise<LocationInfo | null> {
    const response = await this.sendCommandAsync('~M114');
    if (response === null) return null;

    try {
      return new LocationInfo().fromReplay(this.normalizeA3TextResponse(response));
    } catch (error) {
      console.error('A3: Failed to parse position:', error);
      return null;
    }
  }

  /**
   * Gets detailed position information using M663 if the firmware returns coordinates.
   */
  public async getPositionXYZE(): Promise<LocationInfo | null> {
    const response = await this.sendCommandAsync('~M663');
    if (response === null) return null;

    try {
      return new LocationInfo().fromReplay(this.normalizeA3TextResponse(response));
    } catch (error) {
      console.error('A3: Failed to parse XYZE position:', error);
      return null;
    }
  }

  /**
   * Homes all printer axes using G28.
   */
  public async home(): Promise<boolean> {
    return await this.sendCmdOk('~G28');
  }

  /**
   * Moves the print head to specified coordinates.
   */
  public async move(x: number, y: number, z: number, feedrate: number): Promise<boolean> {
    return await this.sendCmdOk(`~G1 X${x} Y${y} Z${z} F${feedrate}`);
  }

  /**
   * Gets temperature information using M105.
   */
  public async getTempInfo(): Promise<TempInfo | null> {
    const response = await this.sendCommandAsync('~M105');
    if (response === null) return null;

    try {
      return new TempInfo().fromReplay(this.normalizeA3TextResponse(response));
    } catch (error) {
      console.error('A3: Failed to parse temperature info:', error);
      return null;
    }
  }

  /**
   * Sends a command and interprets Adventurer 3 success semantics.
   */
  public async sendCmdOk(cmd: string): Promise<boolean> {
    try {
      const mappedCmd = this.mapControllerCommand(cmd);
      const response = await this.sendCommandAsync(mappedCmd);
      if (response === null) return false;
      if (this.shouldSkipResponseWait(mappedCmd)) return true;
      return this.isSuccessfulCommandResponse(mappedCmd, response);
    } catch {
      return false;
    }
  }

  /**
   * Enables stepper motors using M17.
   */
  public async enableMotors(): Promise<boolean> {
    return await this.sendCmdOk('~M17');
  }

  /**
   * Disables stepper motors using M18.
   */
  public async disableMotors(): Promise<boolean> {
    return await this.sendCmdOk('~M18');
  }

  /**
   * Performs an emergency stop using M112.
   */
  public async emergencyStop(): Promise<boolean> {
    return await this.sendCmdOk('~M112');
  }

  /**
   * Sends M108. The Adventurer 3 firmware acknowledges it, but the handler is a no-op.
   */
  public async cancelHeatWait(): Promise<boolean> {
    return await this.sendCmdOk('~M108');
  }

  /**
   * Sends M144 or M145 directly.
   */
  public async customM144(params?: string): Promise<string | null> {
    const cmd = params ? `~M144 ${params}` : '~M144';
    return await this.sendCommandAsync(cmd);
  }

  /**
   * Sends M145 directly.
   */
  public async customM145(params?: string): Promise<string | null> {
    const cmd = params ? `~M145 ${params}` : '~M145';
    return await this.sendCommandAsync(cmd);
  }

  /**
   * Controls the accessory LED bar using M146.
   * `0` turns LEDs off; any other value turns them on.
   */
  public async ledControl(params: string): Promise<boolean> {
    return await this.sendCmdOk(`~M146 ${params}`);
  }

  /**
   * Sends M611 directly.
   */
  public async customM611(): Promise<string | null> {
    return await this.sendCommandAsync('~M611');
  }

  /**
   * Sends M612 directly.
   */
  public async customM612(): Promise<string | null> {
    return await this.sendCommandAsync('~M612');
  }

  /**
   * Sends M650 directly.
   * This returns calibration/PID values, not model information.
   */
  public async customM650(): Promise<string | null> {
    return await this.sendCommandAsync('~M650');
  }

  /**
   * Sends M651 directly.
   */
  public async customM651(): Promise<string | null> {
    return await this.sendCommandAsync('~M651');
  }

  /**
   * Sends M652 directly.
   */
  public async customM652(): Promise<string | null> {
    return await this.sendCommandAsync('~M652');
  }

  /**
   * Sends M653 with parameters.
   */
  public async customM653(params: string): Promise<boolean> {
    return await this.sendCmdOk(`~M653 ${params}`);
  }

  /**
   * Sends M654 with parameters.
   */
  public async customM654(params: string): Promise<boolean> {
    return await this.sendCmdOk(`~M654 ${params}`);
  }

  private parseFileList(response: string): A3FileEntry[] {
    const lines = this.getNormalizedLines(response);
    if (lines.some((line) => line.includes('CMD M661 Error.'))) {
      return [];
    }

    const files: A3FileEntry[] = [];
    const countIndex = lines.findIndex((line) => /info_list\.size:\s*\d+/i.test(line));
    if (countIndex === -1) return files;

    const countMatch = lines[countIndex].match(/info_list\.size:\s*(\d+)/i);
    const fileCount = countMatch ? parseInt(countMatch[1], 10) : 0;
    for (let index = countIndex + 1; index < lines.length && files.length < fileCount; index++) {
      const name = lines[index].trim();
      if (!name || name === 'ok' || name.startsWith('CMD ')) {
        continue;
      }

      files.push({
        name,
        path: `/data/${name}`,
      });
    }

    return files;
  }

  private parseThumbnail(response: string): A3Thumbnail | null {
    const buffer = Buffer.from(response, 'binary');
    const errorText = buffer.toString('utf8');
    if (errorText.includes('Error: File not exists')) {
      return null;
    }

    const magicOffset = buffer.indexOf(Buffer.from([0xa2, 0xa2, 0x2a, 0x2a]));
    if (magicOffset === -1 || buffer.length < magicOffset + 8) {
      console.error('A3: Invalid thumbnail response');
      return null;
    }

    const length = buffer.readUInt32BE(magicOffset + 4);
    if (buffer.length < magicOffset + 8 + length) {
      console.error('A3: Thumbnail response truncated');
      return null;
    }

    return {
      data: buffer.subarray(magicOffset + 8, magicOffset + 8 + length),
    };
  }

  private normalizeA3TextResponse(response: string): string {
    let normalized = response.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    if (lines.length > 0) {
      lines[0] = lines[0].replace(/^(ack|echo):\s*/i, '');
    }
    normalized = lines.join('\n').trimEnd();

    if (normalized.startsWith('"') && normalized.endsWith('"')) {
      normalized = normalized.slice(1, -1);
    }

    return normalized.trimEnd();
  }

  private getNormalizedLines(response: string): string[] {
    return this.normalizeA3TextResponse(response)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  private mapControllerCommand(cmd: string): string {
    if (cmd === GCodes.CmdLedOn) return '~M146 1';
    if (cmd === GCodes.CmdLedOff) return '~M146 0';
    return cmd;
  }

  private isSuccessfulCommandResponse(cmd: string, response: string): boolean {
    const normalized = this.normalizeA3TextResponse(response).trim();
    if (normalized.length === 0) {
      return this.shouldSkipResponseWait(cmd);
    }

    if (normalized.includes('Error:') || normalized.includes('Control failed.')) {
      return false;
    }

    const bareCmd = this.stripProtocolPrefix(cmd);
    if (bareCmd.startsWith('M23')) {
      return normalized.includes('File opened') || normalized.includes('ok');
    }

    if (bareCmd.startsWith('M112')) {
      return /Emergency Stop/i.test(normalized) || normalized.includes('Received.');
    }

    if (normalized.includes('ok') || normalized.includes('Received.')) {
      return true;
    }

    return normalized.startsWith(bareCmd);
  }

  private stripProtocolPrefix(cmd: string): string {
    return cmd.trim().replace(/^~/, '');
  }
}
