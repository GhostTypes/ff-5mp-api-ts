/**
 * @fileoverview Temperature control module for FlashForge 5M printers.
 * Sets and cancels extruder/bed temperatures. The 5M / 5M Pro / AD5X use direct
 * TCP G-code/M-code commands; HTTP-only printers (Creator 5 / 5 Pro, no TCP
 * channel) use the HTTP `temperatureCtl_cmd` instead.
 */
// src/api/controls/TempControl.ts
import type { FiveMClient } from '../../FiveMClient';
import type { FlashForgeClient } from '../../tcpapi/FlashForgeClient';
import { Commands } from '../server/Commands';

/**
 * Sentinel value for `temperatureCtl_cmd` meaning "leave this heater unchanged"
 * (partial update). Sending a real 0 / -100 would turn the heater off.
 */
const TEMP_NO_CHANGE = -200;
/** `temperatureCtl_cmd` value that turns a heater off. */
const TEMP_OFF = -100;

/**
 * Provides methods for controlling the temperatures of various components of the FlashForge 3D printer,
 * such as the extruder and the print bed. Uses TCP G-code commands on dual-API printers and the HTTP
 * `temperatureCtl_cmd` on HTTP-only printers (Creator 5 / 5 Pro).
 */
export class TempControl {
  private client: FiveMClient;
  private tcpClient: FlashForgeClient;

  /**
   * Creates an instance of the TempControl class.
   * @param printerClient The FiveMClient instance used for communication with the printer.
   */
  constructor(printerClient: FiveMClient) {
    this.client = printerClient;
    this.tcpClient = printerClient.tcpClient;
  }

  /**
   * Sends a `temperatureCtl_cmd` over HTTP with the given setpoints. Unspecified
   * heaters are left unchanged via the {@link TEMP_NO_CHANGE} sentinel.
   * @param args Per-heater target temperatures (omit to leave unchanged).
   * @returns A Promise resolving to true if the command is acknowledged.
   */
  private async sendHttpTempCommand(args: {
    rightNozzle?: number;
    leftNozzle?: number;
    platform?: number;
    chamber?: number;
  }): Promise<boolean> {
    return await this.client.control.sendControlCommand(Commands.TempControlCmd, {
      rightNozzle: args.rightNozzle ?? TEMP_NO_CHANGE,
      leftNozzle: args.leftNozzle ?? TEMP_NO_CHANGE,
      platform: args.platform ?? TEMP_NO_CHANGE,
      chamber: args.chamber ?? TEMP_NO_CHANGE,
    });
  }

  /**
   * Sets the target temperature for the printer's extruder.
   * @param temp The target temperature in Celsius.
   * @returns A Promise that resolves to true if the command is successful, false otherwise.
   */
  public async setExtruderTemp(temp: number): Promise<boolean> {
    if (this.client.httpOnly) {
      return await this.sendHttpTempCommand({ rightNozzle: temp });
    }
    return await this.tcpClient.setExtruderTemp(temp);
  }

  /**
   * Sets the target temperature for the printer's print bed.
   * @param temp The target temperature in Celsius.
   * @returns A Promise that resolves to true if the command is successful, false otherwise.
   */
  public async setBedTemp(temp: number): Promise<boolean> {
    if (this.client.httpOnly) {
      return await this.sendHttpTempCommand({ platform: temp });
    }
    return await this.tcpClient.setBedTemp(temp);
  }

  /**
   * Cancels any ongoing extruder heating and sets its target temperature to 0.
   * @returns A Promise that resolves to true if the command is successful, false otherwise.
   */
  public async cancelExtruderTemp(): Promise<boolean> {
    if (this.client.httpOnly) {
      return await this.sendHttpTempCommand({ rightNozzle: TEMP_OFF });
    }
    return await this.tcpClient.cancelExtruderTemp();
  }

  /**
   * Cancels any ongoing print bed heating and sets its target temperature to 0.
   * @returns A Promise that resolves to true if the command is successful, false otherwise.
   */
  public async cancelBedTemp(): Promise<boolean> {
    if (this.client.httpOnly) {
      return await this.sendHttpTempCommand({ platform: TEMP_OFF });
    }
    return await this.tcpClient.cancelBedTemp();
  }

  /**
   * Waits for the print bed (platform) to cool down to or below a specified temperature.
   * This is typically used after a print finishes to ensure the part can be safely removed.
   *
   * Relies on TCP G-code polling and is therefore unavailable on HTTP-only printers
   * (Creator 5 / 5 Pro); callers should poll {@link FiveMClient.info} instead.
   * @param temp The target temperature in Celsius to wait for the bed to reach.
   * @returns A Promise that resolves when the bed temperature is at or below the specified temperature.
   */
  public async waitForPartCool(temp: number): Promise<void> {
    if (this.client.httpOnly) {
      console.log('waitForPartCool() unavailable over HTTP-only connection; poll info.get() instead.');
      return;
    }
    await this.tcpClient.gCode().waitForBedTemp(temp, true);
  }
}
