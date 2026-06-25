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
 * Number of tool/nozzle entries the Creator 5 firmware requires in the
 * `nozzles` array. The firmware ignores the array unless its length is exactly
 * this (confirmed via Ghidra: `size() == 4` check in the temp parser).
 */
const NOZZLE_COUNT = 4;

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
    nozzles?: number[];
  }): Promise<boolean> {
    const payload: {
      rightNozzle: number;
      leftNozzle: number;
      platform: number;
      chamber: number;
      nozzles?: number[];
    } = {
      rightNozzle: args.rightNozzle ?? TEMP_NO_CHANGE,
      leftNozzle: args.leftNozzle ?? TEMP_NO_CHANGE,
      platform: args.platform ?? TEMP_NO_CHANGE,
      chamber: args.chamber ?? TEMP_NO_CHANGE,
    };
    // Per-tool targets for Creator 5 tool-changers. Only included when supplied so
    // the firmware's `size() == 4` check doesn't reject a partial/absent array.
    if (args.nozzles !== undefined) {
      payload.nozzles = args.nozzles;
    }
    return await this.client.control.sendControlCommand(Commands.TempControlCmd, payload);
  }

  /**
   * Builds a {@link NOZZLE_COUNT}-length `nozzles` array of {@link TEMP_NO_CHANGE}
   * placeholders with a single tool set to `value`.
   * @returns The array, or null if `toolIndex` is out of range.
   */
  private buildNozzleArray(toolIndex: number, value: number): number[] | null {
    if (!Number.isInteger(toolIndex) || toolIndex < 0 || toolIndex >= NOZZLE_COUNT) {
      console.error(`TempControl: toolIndex ${toolIndex} out of range (0-${NOZZLE_COUNT - 1}).`);
      return null;
    }
    const nozzles = new Array<number>(NOZZLE_COUNT).fill(TEMP_NO_CHANGE);
    nozzles[toolIndex] = value;
    return nozzles;
  }

  /**
   * Sets the target temperature for a single tool/nozzle on a Creator 5 series
   * tool-changer, leaving the other tools unchanged. Sent as a `nozzles` array
   * (Creator 5 / 5 Pro, HTTP-only); see {@link setToolTemps} to set all at once.
   * @param toolIndex Zero-based tool index (0-3 for T0-T3).
   * @param temp Target temperature in Celsius.
   * @returns A Promise resolving to true if the command is acknowledged.
   */
  public async setToolTemp(toolIndex: number, temp: number): Promise<boolean> {
    const nozzles = this.buildNozzleArray(toolIndex, temp);
    if (nozzles === null) return false;
    return await this.sendHttpTempCommand({ nozzles });
  }

  /**
   * Sets the target temperatures for all tools/nozzles on a Creator 5 series
   * tool-changer in one command. Use {@link TEMP_NO_CHANGE} (-200) to leave a
   * tool unchanged or {@link TEMP_OFF} (-100) to turn one off. Must contain
   * exactly {@link NOZZLE_COUNT} entries.
   * @param temps Per-tool target temperatures, ordered T0..T3.
   * @returns A Promise resolving to true if the command is acknowledged.
   */
  public async setToolTemps(temps: number[]): Promise<boolean> {
    if (temps.length !== NOZZLE_COUNT) {
      console.error(`setToolTemps: expected ${NOZZLE_COUNT} temps, got ${temps.length}.`);
      return false;
    }
    return await this.sendHttpTempCommand({ nozzles: [...temps] });
  }

  /**
   * Cancels heating for a single tool/nozzle on a Creator 5 series tool-changer
   * (sets its target to 0), leaving the other tools unchanged.
   * @param toolIndex Zero-based tool index (0-3 for T0-T3).
   * @returns A Promise resolving to true if the command is acknowledged.
   */
  public async cancelToolTemp(toolIndex: number): Promise<boolean> {
    const nozzles = this.buildNozzleArray(toolIndex, TEMP_OFF);
    if (nozzles === null) return false;
    return await this.sendHttpTempCommand({ nozzles });
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
   * Sets the target temperature for the printer's heated chamber. Only the
   * Creator 5 series has a chamber heater, and those printers are HTTP-only, so
   * this always goes over the HTTP `temperatureCtl_cmd`. Printers without a
   * chamber ignore the field. The firmware caps the chamber at 80°C.
   * @param temp The target temperature in Celsius.
   * @returns A Promise that resolves to true if the command is acknowledged.
   */
  public async setChamberTemp(temp: number): Promise<boolean> {
    return await this.sendHttpTempCommand({ chamber: temp });
  }

  /**
   * Cancels any ongoing chamber heating and sets its target temperature to 0.
   * @returns A Promise that resolves to true if the command is acknowledged.
   */
  public async cancelChamberTemp(): Promise<boolean> {
    return await this.sendHttpTempCommand({ chamber: TEMP_OFF });
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
      console.log(
        'waitForPartCool() unavailable over HTTP-only connection; poll info.get() instead.'
      );
      return;
    }
    await this.tcpClient.gCode().waitForBedTemp(temp, true);
  }
}
