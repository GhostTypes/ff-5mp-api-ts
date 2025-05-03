// src/FiveMClient.ts
import axios from 'axios';
import { FFPrinterDetail, FFMachineInfo, MachineState, Temperature } from './models/ff-models';
import { Control, GenericResponse } from './api/controls/Control';
import { NetworkUtils } from './api/network/NetworkUtils';
import { JobControl } from './api/controls/JobControl';
import { Info } from './api/controls/Info';
import { Files } from './api/controls/Files';
import { TempControl } from './api/controls/TempControl';
import { FlashForgeClient } from './tcpapi/FlashForgeClient';
import { Endpoints } from './api/server/Endpoints';
import {MachineInfo} from "./models/MachineInfo";

export class FiveMClient {
    private readonly PORT = 8898;

    public control: Control;
    public jobControl: JobControl;
    public info: Info;
    public files: Files;
    public tempControl: TempControl;
    public tcpClient: FlashForgeClient;

    public serialNumber: string;
    public checkCode: string;
    public httpClient: ReturnType<typeof axios.create>;

    // HTTP Client semaphore implementation will be different in JS
    private httpClientBusy = false;

    public printerName: string = '';
    public isPro: boolean = false;
    public firmwareVersion: string = '';
    public firmVer: string = ''; // Version object in C#, will use string in TS

    public ipAddress: string;
    public macAddress: string = '';

    public flashCloudCode: string = '';
    public polarCloudCode: string = '';

    public lifetimePrintTime: string = '';
    public lifetimeFilamentMeters: string = '';

    // Control states
    public ledControl: boolean = false;
    public filtrationControl: boolean = false;

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

        this.tcpClient = new FlashForgeClient(ipAddress);
        this.control = new Control(this);
        this.jobControl = new JobControl(this);
        this.info = new Info(this);
        this.files = new Files(this);
        this.tempControl = new TempControl(this);
    }

    public async initialize(): Promise<boolean> {
        const connected = await this.verifyConnection();
        if (connected) {
            console.log("Connected to printer successfully");
            return true;
        }
        console.log("Failed to connect to printer");
        return false;
    }

    public async isHttpClientBusy(): Promise<boolean> {
        return this.httpClientBusy;
    }

    public releaseHttpClient(): void {
        this.httpClientBusy = false;
    }

    public async initControl(): Promise<boolean> {
        console.log("InitControl()");
        if (await this.sendProductCommand()) {
            return await this.tcpClient.initControl();
        }
        console.log("New API control failed!");
        return false;
    }

    public dispose(): void {
        this.tcpClient.stopKeepAlive(true);
        this.tcpClient.dispose();
    }

    public cacheDetails(info: FFMachineInfo | null): boolean {
        if (!info) return false;

        console.log(JSON.stringify(info, null, 2));
        // Add null checks for all properties
        this.printerName = info.Name || '';
        // todo this is unreliable, need to check machine type from the TcpApi instead
        this.isPro = (info.Name || '').includes("Pro");
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

    public getEndpoint(endpoint: string): string {
        return `http://${this.ipAddress}:${this.PORT}${endpoint}`;
    }

    public async verifyConnection(): Promise<boolean> {
        // todo somewhere in here is where we should check if pro or not
        // with the TcpApi
        try {
            const response = await this.info.getDetailResponse();
            if (!response || !NetworkUtils.isOk(response)) {
                console.log("Failed to get valid response from printer API");
                return false;
            }

            // Debug output to see what's being returned
            console.log("Received response from printer API");

            // Make sure MachineInfo handles null values properly
            const machineInfo = new MachineInfo().fromDetail(response.detail);
            if (!machineInfo) {
                console.log("Failed to parse machine info from response");
                return false;
            }

            return this.cacheDetails(machineInfo);
        } catch (error: unknown) {
            const err = error as Error;
            console.log(`Error in verifyConnection: ${err.message}`);
            console.log(err.stack);
            return false;
        }
    }

    public async sendProductCommand(): Promise<boolean> {
        console.log("SendProductCommand()");
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

                    console.log("LedControl: " + this.ledControl);
                    console.log("FiltrationControl: " + this.filtrationControl);

                    return true;
                }
            } catch (e) {
                //console.log(`SendProductCommand failure: ${e.message}\n${e.stack}`);
            }
        } catch (e) {
            //console.log(`SendProductCommand failure: ${e.message}\n${e.stack}`);
        } finally {
            this.httpClientBusy = false;
        }

        return false;
    }
}

interface ProductResponse extends GenericResponse {
    product: Product;
}

interface Product {
    chamberTempCtrlState: number;
    externalFanCtrlState: number;
    internalFanCtrlState: number;
    lightCtrlState: number;
    nozzleTempCtrlState: number;
    platformTempCtrlState: number;
}
