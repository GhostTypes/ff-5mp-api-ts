/**
 * @fileoverview G-code controller for FlashForge Adventurer 3 printers.
 *
 * Extends GCodeController with Adventurer 3-specific commands and behaviors.
 * Provides high-level methods for all A3 G-code and M-code operations.
 *
 * @see https://github.com/GhostTypes/ff-5mp-api-ts
 */

import type { FlashForgeA3Client } from '../FlashForgeA3Client';
import { GCodeController } from './GCodeController';

/**
 * G-code controller for Adventurer 3 printers.
 *
 * Provides convenience methods for:
 * - Motion control (G1, G28, G90, G91, G92)
 * - Temperature control (M104, M105, M140)
 * - Print job management (M23, M24, M25, M26, M27)
 * - File operations (M28, M29, M661, M662)
 * - LED control (M146)
 * - Status queries (M114, M115, M119)
 * - Motor control (M17, M18)
 * - Fan control (M106, M107)
 * - Emergency operations (M108, M112)
 */
export class A3GCodeController extends GCodeController<FlashForgeA3Client> {
  /**
   * Sets the printer name using M610.
   * @param name The new printer name.
   * @returns A Promise that resolves to true if successful.
   */
  public async setPrinterName(name: string): Promise<boolean> {
    return await this.tcpClient.setPrinterName(name);
  }

  /**
   * Gets print status with layer and SD byte progress.
   * @returns A Promise that resolves to print status or null.
   */
  public async getPrintStatus() {
    return await this.tcpClient.getPrintStatus();
  }

  /**
   * Lists all files on the printer's SD card.
   * @returns A Promise that resolves to an array of file entries.
   */
  public async listFiles() {
    return await this.tcpClient.listFiles();
  }

  /**
   * Gets thumbnail image for a file.
   * @param filename The name of the file (without extension).
   * @returns A Promise that resolves to thumbnail data or null.
   */
  public async getThumbnail(filename: string) {
    return await this.tcpClient.getThumbnail(filename);
  }

  /**
   * Selects a file on SD card for printing.
   * @param filename The path to the file (e.g., "/data/model.gcode").
   * @returns A Promise that resolves to true if successful.
   */
  public async selectFile(filename: string): Promise<boolean> {
    return await this.tcpClient.selectFile(filename);
  }

  /**
   * Selects a file and then starts printing it.
   * Adventurer 3 uses M23 to select and M24 to begin the job.
   */
  public override async startJob(filename: string): Promise<boolean> {
    if (!(await this.tcpClient.selectFile(filename))) {
      return false;
    }

    return await this.tcpClient.startPrint();
  }

  /**
   * Gets the current XYZ position of the print head.
   * @returns A Promise that resolves to position info or null.
   */
  public async getCurrentPosition() {
    return await this.tcpClient.getPosition();
  }

  /**
   * Gets endstop status for all axes.
   * @returns A Promise that resolves to endstop status or null.
   */
  public async getEndstopStatus() {
    return await this.tcpClient.getEndstopStatus();
  }

  /**
   * Enables stepper motors (M17).
   * @returns A Promise that resolves to true if successful.
   */
  public async enableMotors(): Promise<boolean> {
    return await this.tcpClient.enableMotors();
  }

  /**
   * Disables stepper motors (M18).
   * @returns A Promise that resolves to true if successful.
   */
  public async disableMotors(): Promise<boolean> {
    return await this.tcpClient.disableMotors();
  }

  /**
   * Performs emergency stop (M112).
   * WARNING: This immediately stops all printer operations!
   * @returns A Promise that resolves to true if successful.
   */
  public async emergencyStop(): Promise<boolean> {
    return await this.tcpClient.emergencyStop();
  }

  /**
   * Cancels heat waiting (M108).
   * @returns A Promise that resolves to true if successful.
   */
  public async cancelHeatWait(): Promise<boolean> {
    return await this.tcpClient.cancelHeatWait();
  }

  /**
   * Controls printer LED using M146.
   * Adventurer 3 requires LED accessory.
   * @param params LED control parameters.
   * @returns A Promise that resolves to true if successful.
   */
  public async ledControl(params: string): Promise<boolean> {
    return await this.tcpClient.ledControl(params);
  }

  /**
   * Sends M144 custom EEPROM command.
   * @param params Optional command parameters.
   * @returns A Promise that resolves to the response or null.
   */
  public async customM144(params?: string) {
    return await this.tcpClient.customM144(params);
  }

  /**
   * Sends M145 custom EEPROM command.
   * @param params Optional command parameters.
   * @returns A Promise that resolves to the response or null.
   */
  public async customM145(params?: string) {
    return await this.tcpClient.customM145(params);
  }

  /**
   * Gets the printer model string from M115 machine info.
   */
  public async getPrinterModel() {
    const info = await this.tcpClient.getPrinterInfo();
    return info?.machineType ?? null;
  }

  /**
   * Sends M651 custom printer command.
   * @returns A Promise that resolves to the response or null.
   */
  public async customM651() {
    return await this.tcpClient.customM651();
  }

  /**
   * Sends M652 custom printer command.
   * @returns A Promise that resolves to the response or null.
   */
  public async customM652() {
    return await this.tcpClient.customM652();
  }

  /**
   * Sends M653 custom printer command with parameters.
   * @param params Command parameters.
   * @returns A Promise that resolves to true if successful.
   */
  public async customM653(params: string): Promise<boolean> {
    return await this.tcpClient.customM653(params);
  }

  /**
   * Sends M654 custom printer command with parameters.
   * @param params Command parameters.
   * @returns A Promise that resolves to true if successful.
   */
  public async customM654(params: string): Promise<boolean> {
    return await this.tcpClient.customM654(params);
  }

  /**
   * Sends M611 custom network command.
   * @returns A Promise that resolves to the response or null.
   */
  public async customM611() {
    return await this.tcpClient.customM611();
  }

  /**
   * Sends M612 custom network command.
   * @returns A Promise that resolves to the response or null.
   */
  public async customM612() {
    return await this.tcpClient.customM612();
  }

  /**
   * Gets printer information including firmware version and machine type.
   * @returns A Promise that resolves to printer info or null.
   */
  public async getPrinterInfo() {
    return await this.tcpClient.getPrinterInfo();
  }

  /**
   * Convenience method to check if printer is an Adventurer 3.
   * @returns A Promise that resolves to true if this is an Adventurer 3.
   */
  public async isAdventurer3(): Promise<boolean> {
    const info = await this.getPrinterInfo();
    if (!info) return false;
    return info.machineType.toLowerCase().includes('adventurer3') ||
           info.machineType.toLowerCase().includes('adventurer 3') ||
           info.machineType.toLowerCase().includes('adventurer iii');
  }

  /**
   * Gets detailed position including extrusion (M663).
   * @returns A Promise that resolves to position info or null.
   */
  public async getDetailedPosition() {
    return await this.tcpClient.getPositionXYZE();
  }
}
