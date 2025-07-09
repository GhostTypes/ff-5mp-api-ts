// src/FiveMClient.ts
import axios from 'axios';
import { FFPrinterDetail, FFMachineInfo, MachineState, Temperature } from './models/ff-models';
import { Control } from './api/controls/Control';
import { JobControl } from './api/controls/JobControl';
import { Info } from './api/controls/Info';
import { Files } from './api/controls/Files';
import { TempControl } from './api/controls/TempControl';
import { FlashForgeClient } from './tcpapi/FlashForgeClient';
import { Endpoints } from './api/server/Endpoints';
import {MachineInfo} from "./models/MachineInfo";
import { GenericResponse } from './api/controls/Control';
import { NetworkUtils } from './api/network/NetworkUtils';

/**
 * Represents a client for interacting with a FlashForge 3D printer.
 * This class provides methods for controlling the printer, managing print jobs,
 * retrieving information, and handling file operations.
 */
export class FiveMClient {
    /** Port used for HTTP communication with the printer. */
    private readonly PORT = 8898;

    /** Instance for general printer control operations. */
    public control: Control;
    /** Instance for managing print jobs. */
    public jobControl: JobControl;
    /** Instance for retrieving printer information. */
    public info: Info;
    /** Instance for managing files on the printer. */
    public files: Files;
    /** Instance for controlling printer temperatures. */
    public tempControl: TempControl;
    /** Instance for lower-level TCP communication with the printer. */
    public tcpClient: FlashForgeClient;

    public serialNumber: string;
    public checkCode: string;
    /** HTTP client for making requests to the printer's API. */
    public httpClient: ReturnType<typeof axios.create>;

    /** Flag indicating if the HTTP client is currently busy with a request. */
    private httpClientBusy = false;

    public printerName: string = '';
    public isPro: boolean = false;
    public isAD5X: boolean = false;
    public firmwareVersion: string = '';
    public firmVer: string = '';

    public ipAddress: string;
    public macAddress: string = '';

    public flashCloudCode: string = '';
    public polarCloudCode: string = '';

    public lifetimePrintTime: string = '';
    public lifetimeFilamentMeters: string = '';

    // Control states
    /** State of the LED light control. */
    public ledControl: boolean = false;
    /** State of the filtration system control. */
    public filtrationControl: boolean = false;

    /**
     * Creates an instance of FiveMClient.
     * @param ipAddress The IP address of the printer.
     * @param serialNumber The serial number of the printer.
     * @param checkCode The check code for the printer.
     */
    constructor(ipAddress: string, serialNumber: string, checkCode: string) {
        this.ipAddress = ipAddress;
        this.serialNumber = serialNumber;
        this.checkCode = checkCode;

        this.httpClient = axios.create({
            timeout: 5000,
            headers: {
                'Accept': '*/*'
            }
        });

        // FlashForgeClient is used internally for some "lower-level" stuff like sending direct g/m-code
        // That isn't available over the new API
        this.tcpClient = new FlashForgeClient(ipAddress);

        this.control = new Control(this);
        this.jobControl = new JobControl(this);
        this.info = new Info(this);
        this.files = new Files(this);
        this.tempControl = new TempControl(this);
    }

    /**
     * Initializes the FiveMClient and verifies the connection to the printer.
     * @returns A Promise that resolves to true if initialization is successful, false otherwise.
     */
    public async initialize(): Promise<boolean> {
        const connected = await this.verifyConnection();
        if (connected) {
            //console.log("Connected to printer successfully");
            return true;
        }
        console.log("Failed to connect to printer");
        return false;
    }

    /**
     * Checks if the HTTP client is currently busy.
     * @returns A Promise that resolves to true if the HTTP client is busy, false otherwise.
     */
    public async isHttpClientBusy(): Promise<boolean> {
        return this.httpClientBusy;
    }

    /**
     * Releases the HTTP client, allowing it to be used for new requests.
     */
    public releaseHttpClient(): void {
        this.httpClientBusy = false;
    }

    /**
     * Initializes the control interface with the printer.
     * This involves sending a product command and initializing TCP control.
     * @returns A Promise that resolves to true if control initialization is successful, false otherwise.
     */
    public async initControl(): Promise<boolean> {
        //console.log("InitControl()");
        if (await this.sendProductCommand()) {
            return await this.tcpClient.initControl();
        }
        console.log("New API control failed!");
        return false;
    }

    /**
     * Disposes of the FiveMClient instance, stopping keep-alive messages and cleaning up resources.
     */
    public dispose(): void {
        this.tcpClient.stopKeepAlive(true);
        this.tcpClient.dispose();
    }

    /**
     * Caches machine details from the provided FFMachineInfo object.
     * @param info The FFMachineInfo object containing printer details.
     * @returns True if caching is successful, false otherwise.
     */
    public cacheDetails(info: FFMachineInfo | null): boolean {
        if (!info) return false;

        // console.log(JSON.stringify(info, null, 2)); // Useful for debugging
        this.printerName = info.Name || '';
        this.isPro = info.IsPro; // Use the value from MachineInfo
        this.isAD5X = info.IsAD5X; // Cache the AD5X status
        this.firmwareVersion = info.FirmwareVersion || '';
        this.firmVer = info.FirmwareVersion ? info.FirmwareVersion.split('-')[0] : '';
        this.macAddress = info.MacAddress || '';
        this.flashCloudCode = info.FlashCloudRegisterCode || '';
        this.polarCloudCode = info.PolarCloudRegisterCode || '';
        this.lifetimePrintTime = info.FormattedTotalRunTime || '';
        this.lifetimeFilamentMeters = info.CumulativeFilament !== undefined ?
            `${info.CumulativeFilament.toFixed(2)}m` : '0.00m';

        return true;
    }

    /**
     * Constructs the full API endpoint URL.
     * @param endpoint The specific API endpoint path.
     * @returns The full URL for the API endpoint.
     */
    public getEndpoint(endpoint: string): string {
        return `http://${this.ipAddress}:${this.PORT}${endpoint}`;
    }

    /**
     * Verifies the connection to the printer by retrieving machine details and TCP information.
     * @returns A Promise that resolves to true if the connection is verified, false otherwise.
     */
    public async verifyConnection(): Promise<boolean> {

        try {
            const response = await this.info.getDetailResponse();
            if (!response || !NetworkUtils.isOk(response)) {
                console.log("Failed to get valid response from printer API");
                return false;
            }

            // Make sure we get a valid detail response
            const machineInfo = new MachineInfo().fromDetail(response.detail);
            if (!machineInfo) { return false; }

            // Check for Pro model with the machine TypeName (can't be changed by user)
            // We now rely on MachineInfo.fromDetail to set IsPro and IsAD5X based on detail.name
            // So, the TCP check for "Pro" might be redundant or could be a fallback.
            // For now, let's keep it but prioritize what's in machineInfo.
            const tcpInfo = await this.tcpClient.getPrinterInfo();
            if (tcpInfo) {
                // If machineInfo hasn't already set isPro, we can use TCP info as a fallback.
                // However, machineInfo.IsPro (derived from detail.name) should be more reliable.
                // This line effectively gets overridden by cacheDetails if machineInfo.IsPro is set.
                if (tcpInfo.TypeName.includes("Pro") && !machineInfo.IsPro && !machineInfo.IsAD5X) {
                    // Only set this if not already determined by machineInfo, and it's not an AD5X
                    this.isPro = true;
                }
            } else {
                console.error("Unable to get PrinterInfo from TcpAPI, some details might be incomplete");
            }
            // we should probably return false if tcpInfo is null here, like we do for machineInfo,
            // but for now, we'll let cacheDetails be the primary source of truth for these flags.

            return this.cacheDetails(machineInfo);
        } catch (error: unknown) {
            const err = error as Error;
            console.log(`Error in verifyConnection: ${err.message}`);
            console.log(err.stack);
            return false;
        }
    }

    /**
     * Sends a product command to the printer to retrieve control states.
     * This method sets the `httpClientBusy` flag while the request is in progress.
     * @returns A Promise that resolves to true if the product command is sent successfully and valid data is received, false otherwise.
     * @throws Error if there is an HTTP error or an error parsing the response.
     */
    public async sendProductCommand(): Promise<boolean> {
        //console.log("SendProductCommand()");
        this.httpClientBusy = true;

        const payload = {
            serialNumber: this.serialNumber,
            checkCode: this.checkCode
        };

        try {
            const response = await this.httpClient.post(
                this.getEndpoint(Endpoints.Product),
                payload
            );

            if (response.status !== 200) return false;

            try {
                const productResponse = response.data as ProductResponse;
                if (productResponse && NetworkUtils.isOk(productResponse)) {
                    // Parse & set control states
                    const product = productResponse.product;
                    this.ledControl = product.lightCtrlState !== 0;
                    this.filtrationControl = !(product.internalFanCtrlState === 0 || product.externalFanCtrlState === 0);
                    //console.log("LedControl: " + this.ledControl);
                    //console.log("FiltrationControl: " + this.filtrationControl);
                    return true;
                }
            } catch (error) {
                console.error(`SendProductCommand error: ${(error as Error).message}`);
                throw error;
            }
        } catch (error) {
            console.error(`SendProductCommand HTTP error: ${(error as Error).message}`);
            throw error;
        } finally {
            this.httpClientBusy = false;
        }

        return false;
    }
}

/**
 * Represents the expected structure of the response from the "product command"
 * sent to the printer (typically to the `/product` endpoint).
 * This response includes general status information (via `GenericResponse`)
 * and a nested `product` object containing specific control states.
 * @see Product
 * @see GenericResponse
 */
interface ProductResponse extends GenericResponse {
    /** Contains various control state flags from the printer. See {@link Product}. */
    product: Product;
}

/**
 * Defines the structure of the `product` object nested within a `ProductResponse`.
 * This interface contains various control state flags reported by the printer,
 * indicating the status or availability of certain features like temperature controls,
 * fan controls, and light controls. A state of 0 often means off/unavailable,
 * while other numbers (typically 1) mean on/available or a specific mode.
 */
interface Product {
    /** State of the chamber temperature control. */
    chamberTempCtrlState: number;
    /** State of the external fan control. */
    externalFanCtrlState: number;
    /** State of the internal fan control. */
    internalFanCtrlState: number;
    /** State of the light control. */
    lightCtrlState: number;
    /** State of the nozzle temperature control. */
    nozzleTempCtrlState: number;
    /** State of the platform (bed) temperature control. */
    platformTempCtrlState: number;
}
