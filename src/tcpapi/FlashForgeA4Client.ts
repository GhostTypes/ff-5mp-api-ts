/**
 * @fileoverview TCP client for FlashForge Adventurer 4 printers.
 *
 * Adventurer 4 Lite and Pro share the same legacy TCP protocol on port 8899.
 * This client keeps the legacy M601 S1 login flow and M115 behavior separate from the
 * generic legacy client while reusing the shared TCP transport and parsers.
 */

import type { GCodeClientCapabilities } from './client/GCodeClientCapabilities';
import { GCodeController } from './client/GCodeController';
import { GCodes } from './client/GCodes';
import { FlashForgeTcpClient, type FlashForgeTcpClientOptions } from './FlashForgeTcpClient';
import { EndstopStatus } from './replays/EndstopStatus';
import { LocationInfo } from './replays/LocationInfo';
import { PrintStatus } from './replays/PrintStatus';
import { TempInfo } from './replays/TempInfo';
import { ThumbnailInfo } from './replays/ThumbnailInfo';

export type A4PrinterVariant = 'lite' | 'pro' | 'unknown';

export interface A4BuildVolume {
  x: number;
  y: number;
  z: number;
}

export interface A4PrinterInfo {
  machineType: string;
  machineName: string;
  firmware: string;
  serialNumber: string | null;
  buildVolume: A4BuildVolume;
  toolCount: number;
  macAddress: string;
  variant: A4PrinterVariant;
  raw: string;
}

export interface A4FileEntry {
  name: string;
  path: string;
}

/**
 * TCP client for FlashForge Adventurer 4 Lite and Pro printers.
 */
export class FlashForgeA4Client
  extends FlashForgeTcpClient
  implements GCodeClientCapabilities
{
  /** The Adventurer 4 TCP port. */
  protected override readonly port = 8899;

  private control: GCodeController<FlashForgeA4Client>;

  constructor(hostname: string, options?: FlashForgeTcpClientOptions) {
    super(hostname, options);
    this.control = new GCodeController(this);
  }

  /**
   * Gets the IP address or hostname of the connected printer.
   */
  public getIp(): string {
    return this.hostname;
  }

  /**
   * Gets the controller instance associated with this client.
   */
  public gCode(): GCodeController<FlashForgeA4Client> {
    return this.control;
  }

  /**
   * Initializes control by sending the legacy M601 S1 login command.
   */
  public async initControl(): Promise<boolean> {
    try {
      const loginCommand = GCodes.CmdLogin;
      const response = await this.sendCommandAsync(loginCommand);
      if (response === null) {
        console.error('A4: Failed to send M601 S1 login command');
        return false;
      }

      if (response.includes('Error: have been connected')) {
        console.warn('A4: Already connected to printer');
        return true;
      }

      if (!this.isSuccessfulCommandResponse(loginCommand, response)) {
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      const info = await this.getPrinterInfo();
      if (!info) {
        console.error('A4: Failed to retrieve printer info after M601 S1');
        return false;
      }

      this.startKeepAlive();
      return true;
    } catch (error) {
      console.error('A4: initControl error:', error);
      return false;
    }
  }

  /**
   * Turns the printer LED on.
   */
  public async ledOn(): Promise<boolean> {
    return await this.control.ledOn();
  }

  /**
   * Turns the printer LED off.
   */
  public async ledOff(): Promise<boolean> {
    return await this.control.ledOff();
  }

  /**
   * Pauses the current print job.
   */
  public async pauseJob(): Promise<boolean> {
    return await this.control.pauseJob();
  }

  /**
   * Resumes a paused print job.
   */
  public async resumeJob(): Promise<boolean> {
    return await this.control.resumeJob();
  }

  /**
   * Stops the active print job.
   */
  public async stopJob(): Promise<boolean> {
    return await this.control.stopJob();
  }

  /**
   * Starts a print job from a stored file.
   */
  public async startJob(name: string): Promise<boolean> {
    return await this.control.startJob(name);
  }

  /**
   * Homes all axes.
   */
  public async homeAxes(): Promise<boolean> {
    return await this.control.home();
  }

  /**
   * Executes the shared rapid-home sequence.
   */
  public async rapidHome(): Promise<boolean> {
    return await this.control.rapidHome();
  }

  /**
   * Sets the target extruder temperature.
   */
  public async setExtruderTemp(temp: number, waitFor: boolean = false): Promise<boolean> {
    return await this.control.setExtruderTemp(temp, waitFor);
  }

  /**
   * Cancels extruder heating.
   */
  public async cancelExtruderTemp(): Promise<boolean> {
    return await this.control.cancelExtruderTemp();
  }

  /**
   * Sets the target bed temperature.
   */
  public async setBedTemp(temp: number, waitFor: boolean = false): Promise<boolean> {
    return await this.control.setBedTemp(temp, waitFor);
  }

  /**
   * Cancels bed heating.
   */
  public async cancelBedTemp(waitForCool: boolean = false): Promise<boolean> {
    return await this.control.cancelBedTemp(waitForCool);
  }

  /**
   * Extrudes a specific amount of filament.
   */
  public async extrude(length: number, feedrate: number = 450): Promise<boolean> {
    return await this.sendCmdOk(`~G1 E${length} F${feedrate}`);
  }

  /**
   * Moves the toolhead in the XY plane.
   */
  public async moveExtruder(x: number, y: number, feedrate: number): Promise<boolean> {
    return await this.sendCmdOk(`~G1 X${x} Y${y} F${feedrate}`);
  }

  /**
   * Moves the toolhead in XYZ space.
   */
  public async move(x: number, y: number, z: number, feedrate: number): Promise<boolean> {
    return await this.sendCmdOk(`~G1 X${x} Y${y} Z${z} F${feedrate}`);
  }

  /**
   * Sends a G-code/M-code command and applies Adventurer 4 success semantics.
   */
  public async sendCmdOk(cmd: string): Promise<boolean> {
    try {
      const response = await this.sendCommandAsync(cmd);
      if (response === null) {
        return false;
      }

      return this.isSuccessfulCommandResponse(cmd, response);
    } catch (error) {
      console.error(`A4: sendCmdOk failed for ${cmd}:`, error);
      return false;
    }
  }

  /**
   * Sends a raw command and returns the raw response text.
   */
  public async sendRawCmd(cmd: string): Promise<string> {
    if (!cmd.includes('M661')) {
      return (await this.sendCommandAsync(cmd)) ?? '';
    }

    const files = await this.getFileListAsync();
    return files.join('\n');
  }

  /**
   * Retrieves documented Adventurer 4 M115 information.
   */
  public async getPrinterInfo(): Promise<A4PrinterInfo | null> {
    const response = await this.sendCommandAsync(GCodes.CmdInfoStatus);
    if (response === null) {
      return null;
    }

    const normalized = this.normalizeA4TextResponse(response);
    const lines = this.getNormalizedLines(normalized);
    const info: A4PrinterInfo = {
      machineType: '',
      machineName: '',
      firmware: '',
      serialNumber: null,
      buildVolume: { x: 220, y: 200, z: 250 },
      toolCount: 1,
      macAddress: '',
      variant: 'unknown',
      raw: normalized,
    };

    for (const line of lines) {
      if (line.startsWith('Machine Type:')) {
        info.machineType = line.replace('Machine Type:', '').trim();
        info.variant = this.detectVariant(info.machineType);
      } else if (line.startsWith('Machine Name:')) {
        info.machineName = line.replace('Machine Name:', '').trim();
      } else if (line.startsWith('Firmware:')) {
        info.firmware = line.replace('Firmware:', '').trim();
      } else if (line.startsWith('SN:')) {
        info.serialNumber = line.replace('SN:', '').trim();
      } else if (line.startsWith('Serial Number:')) {
        info.serialNumber = line.replace('Serial Number:', '').trim();
      } else if (line.startsWith('Tool Count:') || line.startsWith('Tool count:')) {
        info.toolCount = parseInt(line.split(':')[1]?.trim() ?? '1', 10) || 1;
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
   * Retrieves current temperatures.
   */
  public async getTempInfo(): Promise<TempInfo | null> {
    const response = await this.sendCommandAsync(GCodes.CmdTemp);
    return response ? new TempInfo().fromReplay(this.normalizeA4TextResponse(response)) : null;
  }

  /**
   * Retrieves endstop and machine status.
   */
  public async getEndstopInfo(): Promise<EndstopStatus | null> {
    const response = await this.sendCommandAsync(GCodes.CmdEndstopInfo);
    return response
      ? new EndstopStatus().fromReplay(this.normalizeA4TextResponse(response))
      : null;
  }

  /**
   * Alias for callers that use the A3 naming style.
   */
  public async getEndstopStatus(): Promise<EndstopStatus | null> {
    return await this.getEndstopInfo();
  }

  /**
   * Retrieves print progress.
   */
  public async getPrintStatus(): Promise<PrintStatus | null> {
    const response = await this.sendCommandAsync(GCodes.CmdPrintStatus);
    return response ? new PrintStatus().fromReplay(this.normalizeA4TextResponse(response)) : null;
  }

  /**
   * Retrieves current toolhead location.
   */
  public async getLocationInfo(): Promise<LocationInfo | null> {
    const response = await this.sendCommandAsync(GCodes.CmdInfoXyzab);
    return response ? new LocationInfo().fromReplay(this.normalizeA4TextResponse(response)) : null;
  }

  /**
   * Returns a normalized file listing with `/data/` paths.
   */
  public async listFiles(): Promise<A4FileEntry[]> {
    const files = await this.getFileListAsync();
    return files.map((relativePath) => {
      const normalizedPath = relativePath.startsWith('/data/')
        ? relativePath
        : `/data/${relativePath}`;
      const pathParts = normalizedPath.split('/');
      return {
        name: pathParts[pathParts.length - 1] || relativePath,
        path: normalizedPath,
      };
    });
  }

  /**
   * Retrieves the thumbnail for a stored file.
   */
  public async getThumbnail(fileName: string): Promise<ThumbnailInfo | null> {
    const filePath = fileName.startsWith('/data/') ? fileName : `/data/${fileName}`;
    const response = await this.sendCommandAsync(`${GCodes.CmdGetThumbnail} ${filePath}`);
    return response ? new ThumbnailInfo().fromReplay(response, fileName) : null;
  }

  private normalizeA4TextResponse(response: string): string {
    let normalized = response.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
    const lines = normalized.split('\n');
    if (lines.length > 0) {
      lines[0] = lines[0].replace(/^(ack|echo):\s*/i, '');
    }
    normalized = lines.join('\n').trimEnd();

    if (normalized.startsWith('"') && normalized.endsWith('"')) {
      normalized = normalized.slice(1, -1).trimEnd();
    }

    return normalized;
  }

  private getNormalizedLines(response: string): string[] {
    return this.normalizeA4TextResponse(response)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  private detectVariant(machineType: string): A4PrinterVariant {
    const normalizedType = machineType.toUpperCase();
    if (normalizedType.includes('PRO')) {
      return 'pro';
    }

    if (normalizedType.includes('ADVENTURER 4') || normalizedType.includes('ADVENTURER4')) {
      return 'lite';
    }

    return 'unknown';
  }

  private isSuccessfulCommandResponse(cmd: string, response: string): boolean {
    const normalized = this.normalizeA4TextResponse(response).trim();
    if (!normalized) {
      return false;
    }

    if (normalized.includes('Error:') || normalized.includes('Control failed.')) {
      return false;
    }

    const bareCmd = cmd.trim().replace(/^~/, '').split(/\s+/, 1)[0];
    if (bareCmd === 'M23') {
      return normalized.includes('File opened') || normalized.includes('ok');
    }

    if (normalized.includes('ok') || normalized.includes('Received.')) {
      return true;
    }

    return normalized.startsWith(bareCmd);
  }
}
