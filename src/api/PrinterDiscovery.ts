/**
 * @fileoverview Universal FlashForge printer discovery using UDP broadcast/multicast.
 *
 * Implements multi-port, multi-format UDP discovery supporting all FlashForge models:
 * - AD5X, 5M, 5M Pro (276-byte modern protocol)
 * - Adventurer 4, Adventurer 3 (140-byte legacy protocol)
 */
import * as dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import { networkInterfaces } from 'node:os';
import {
    type DiscoveredPrinter,
    type DiscoveryOptions,
    PrinterModel,
    PrinterStatus,
    DiscoveryProtocol,
} from '../models/PrinterDiscovery';
import { InvalidResponseError, SocketCreationError } from './network/DiscoveryErrors';

/**
 * Default configuration values for printer discovery.
 */
const DEFAULT_DISCOVERY_OPTIONS: Required<DiscoveryOptions> = {
    timeout: 10000,
    idleTimeout: 1500,
    maxRetries: 3,
    useMulticast: true,
    useBroadcast: true,
    ports: [8899, 19000, 48899],
};

/**
 * Multicast group address used by FlashForge printers.
 */
const MULTICAST_ADDRESS = '225.0.0.9';

/**
 * Modern protocol: 276-byte responses (AD5X, 5M, 5M Pro)
 */
const MODERN_PROTOCOL_SIZE = 276;

/**
 * Legacy protocol: 140-byte responses (Adventurer 3, Adventurer 4)
 */
const LEGACY_PROTOCOL_SIZE = 140;

/**
 * EventEmitter-based continuous discovery monitor.
 *
 * Emits 'discovered', 'end', and 'error' events during printer discovery.
 */
class DiscoveryMonitor extends EventEmitter {
    private socket: dgram.Socket | null = null;
    private intervalHandle: NodeJS.Timeout | null = null;
    private timeoutHandle: NodeJS.Timeout | null = null;
    private idleTimeoutHandle: NodeJS.Timeout | null = null;
    private discovered: Set<string> = new Set();
    private stopped = false;
    private endEmitted = false;

    constructor(
        private readonly discovery: PrinterDiscovery,
        private readonly config: Required<DiscoveryOptions>
    ) {
        super();
    }

    private emitEndIfNeeded(): void {
        if (!this.endEmitted) {
            this.endEmitted = true;
            this.emit('end');
        }
    }

    private resetIdleTimeout(): void {
        if (this.idleTimeoutHandle) {
            clearTimeout(this.idleTimeoutHandle);
        }

        this.idleTimeoutHandle = setTimeout(() => {
            this.stop();
        }, this.config.idleTimeout);
    }

    /**
     * Start the monitoring process.
     */
    public async start(): Promise<void> {
        if (this.stopped) {
            throw new Error('Monitor cannot be started after being stopped');
        }

        try {
            this.socket = await this.discovery.createDiscoverySocket();
            await this.discovery.bindSocket(this.socket);

            this.socket.on('message', (buffer: Buffer, rinfo: dgram.RemoteInfo) => {
                const printer = this.discovery.parseDiscoveryResponse(buffer, rinfo);
                if (printer) {
                    this.resetIdleTimeout();

                    const key = `${printer.ipAddress}:${printer.commandPort}`;
                    if (!this.discovered.has(key)) {
                        this.discovered.add(key);
                        this.emit('discovered', printer);
                    }
                }
            });

            // Send discovery packets periodically
            const sendPackets = () => {
                if (this.socket && !this.stopped) {
                    this.discovery.sendDiscoveryPackets(this.socket, this.config);
                }
            };

            sendPackets();
            this.intervalHandle = setInterval(sendPackets, this.config.timeout);

            // Auto-stop after specified timeout
            this.timeoutHandle = setTimeout(() => {
                this.stop();
            }, this.config.timeout * this.config.maxRetries);
        } catch (error) {
            if (this.listenerCount('error') > 0) {
                this.emit('error', error);
            } else {
                console.error('Discovery monitor error:', error);
            }
            this.stop();
        }
    }

    /**
     * Stop monitoring and clean up resources.
     */
    public stop(): void {
        if (this.stopped) {
            return;
        }

        this.stopped = true;

        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }

        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = null;
        }

        if (this.idleTimeoutHandle) {
            clearTimeout(this.idleTimeoutHandle);
            this.idleTimeoutHandle = null;
        }

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.emitEndIfNeeded();
    }
}

/**
 * Universal FlashForge printer discovery using UDP broadcast/multicast.
 *
 * Supports discovery across multiple protocols and port configurations:
 * - Modern protocol (276 bytes): AD5X, 5M, 5M Pro
 * - Legacy protocol (140 bytes): Adventurer 3, Adventurer 4
 *
 * Example usage:
 * ```typescript
 * const discovery = new PrinterDiscovery();
 * const printers = await discovery.discover({ timeout: 5000 });
 *
 * // Or use event-based monitoring
 * const monitor = discovery.monitor();
 * monitor.on('discovered', (printer: DiscoveredPrinter) => {
 *   console.log(`Found: ${printer.name} at ${printer.ipAddress}`);
 * });
 * ```
 */
export class PrinterDiscovery {
    /**
     * Discovers FlashForge printers on the local network.
     *
     * Sends UDP discovery packets to multiple ports and protocols,
     * collects responses, and returns deduplicated printer information.
     *
     * @param options Optional configuration for discovery behavior
     * @returns Promise resolving to array of discovered printers
     */
    public async discover(options?: DiscoveryOptions): Promise<DiscoveredPrinter[]> {
        const config: Required<DiscoveryOptions> = { ...DEFAULT_DISCOVERY_OPTIONS, ...options };
        const printers = new Map<string, DiscoveredPrinter>();
        let attempt = 0;

        while (attempt < config.maxRetries) {
            attempt++;
            const socket = await this.createDiscoverySocket();

            try {
                await this.bindSocket(socket);
                this.sendDiscoveryPackets(socket, config);

                const discoveredPrinters = await this.receiveResponses(
                    socket,
                    config.timeout,
                    config.idleTimeout
                );

                // Merge with existing printers, preferring modern protocol responses
                for (const printer of discoveredPrinters) {
                    const key = `${printer.ipAddress}:${printer.commandPort}`;
                    const existing = printers.get(key);

                    if (!existing || printer.protocolFormat === DiscoveryProtocol.Modern) {
                        printers.set(key, printer);
                    }
                }

                if (printers.size > 0) {
                    break; // Printers found, exit retry loop
                }
            } finally {
                socket.close();
            }

            if (attempt < config.maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        return Array.from(printers.values());
    }

    /**
     * Starts continuous monitoring for printers on the network.
     *
     * Returns a DiscoveryMonitor that emits 'discovered' events for each printer found.
     * Monitoring continues until stop() is called or the timeout expires.
     * If one or more printers have been discovered, idleTimeout will stop monitoring
     * early after the configured period of inactivity.
     *
     * @param options Optional configuration for monitoring behavior
     * @returns DiscoveryMonitor that emits 'discovered' events
     */
    public monitor(options?: DiscoveryOptions): DiscoveryMonitor {
        const config: Required<DiscoveryOptions> = { ...DEFAULT_DISCOVERY_OPTIONS, ...options };
        const monitor = new DiscoveryMonitor(this, config);

        // Start on next tick so callers can attach listeners before events are emitted
        queueMicrotask(() => {
            void monitor.start();
        });

        return monitor;
    }

    /**
     * Creates a UDP socket for discovery operations.
     *
     * @returns Promise resolving to configured UDP socket
     * @public
     */
    public async createDiscoverySocket(): Promise<dgram.Socket> {
        return new Promise((resolve, reject) => {
            try {
                const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
                socket.on('error', (error) => {
                    reject(new SocketCreationError(error.message));
                });
                resolve(socket);
            } catch (error) {
                reject(new SocketCreationError((error as Error).message));
            }
        });
    }

    /**
     * Binds the discovery socket to an available port.
     *
     * @param socket The UDP socket to bind
     * @returns Promise that resolves when binding is complete
     * @public
     */
    public async bindSocket(socket: dgram.Socket): Promise<void> {
        return new Promise((resolve, reject) => {
            socket.bind(0, () => {
                socket.setBroadcast(true);
                resolve();
            });
            socket.on('error', reject);
        });
    }

    /**
     * Sends UDP discovery packets to all configured ports and addresses.
     *
     * @param socket The UDP socket to use for sending
     * @param options Discovery configuration options
     * @public
     */
    public sendDiscoveryPackets(
        socket: dgram.Socket,
        options: Required<DiscoveryOptions>
    ): void {
        const emptyPacket = Buffer.alloc(0);

        // Multicast discovery - join group once, then send to all relevant ports
        if (options.useMulticast) {
            try {
                socket.addMembership(MULTICAST_ADDRESS);
            } catch (error) {
                // Log but continue - sending may still work depending on OS/network config
                console.warn(`Discovery: Failed to join multicast group ${MULTICAST_ADDRESS} - ${(error as Error).message}`);
            }

            for (const port of options.ports) {
                if (port === 8899 || port === 19000) {
                    try {
                        socket.send(emptyPacket, 0, 0, port, MULTICAST_ADDRESS);
                    } catch (error) {
                        console.warn(`Discovery: Failed to send multicast to ${MULTICAST_ADDRESS}:${port} - ${(error as Error).message}`);
                    }
                }
            }
        }

        // Broadcast discovery
        if (options.useBroadcast) {
            const broadcastAddresses = this.getBroadcastAddresses();
            for (const address of broadcastAddresses) {
                for (const port of options.ports) {
                    if (port === 48899) {
                        try {
                            socket.send(emptyPacket, 0, 0, port, address);
                        } catch (error) {
                            console.warn(`Discovery: Failed to send broadcast to ${address}:${port} - ${(error as Error).message}`);
                        }
                    }
                }
            }
        }

        // Direct broadcast fallback probes
        if (options.useBroadcast) {
            for (const port of options.ports) {
                try {
                    socket.send(emptyPacket, 0, 0, port, '255.255.255.255');
                } catch (error) {
                    console.warn(`Discovery: Failed to send to broadcast 255.255.255.255:${port} - ${(error as Error).message}`);
                }
            }
        }
    }

    /**
     * Receives and parses printer responses from the UDP socket.
     *
     * @param socket The UDP socket to listen on
     * @param totalTimeoutMs Total time to wait for responses
     * @param idleTimeoutMs Idle time before stopping after last response
     * @returns Promise resolving to array of discovered printers
     * @private
     */
    protected async receiveResponses(
        socket: dgram.Socket,
        totalTimeoutMs: number,
        idleTimeoutMs: number
    ): Promise<DiscoveredPrinter[]> {
        const printers: DiscoveredPrinter[] = [];

        return new Promise((resolve) => {
            let totalTimeoutHandle: NodeJS.Timeout | null = null;
            let idleTimeoutHandle: NodeJS.Timeout | null = null;

            const cleanupAndResolve = () => {
                if (totalTimeoutHandle) {
                    clearTimeout(totalTimeoutHandle);
                }
                if (idleTimeoutHandle) {
                    clearTimeout(idleTimeoutHandle);
                }
                socket.removeAllListeners('message');
                socket.removeAllListeners('error');
                resolve(printers);
            };

            // Set total timeout
            totalTimeoutHandle = setTimeout(() => {
                cleanupAndResolve();
            }, totalTimeoutMs);

            const resetIdleTimeout = () => {
                if (idleTimeoutHandle) {
                    clearTimeout(idleTimeoutHandle);
                }
                idleTimeoutHandle = setTimeout(() => {
                    cleanupAndResolve();
                }, idleTimeoutMs);
            };

            // Handle incoming messages
            socket.on('message', (buffer: Buffer, rinfo: dgram.RemoteInfo) => {
                resetIdleTimeout();

                const printer = this.parseDiscoveryResponse(buffer, rinfo);
                if (printer) {
                    printers.push(printer);
                }
            });

            // Handle errors gracefully
            socket.on('error', (error) => {
                console.error(`Socket error during discovery: ${error.message}`);
            });

            // Start the idle timeout
            resetIdleTimeout();
        });
    }

    /**
     * Parses a UDP discovery response from a printer.
     *
     * Determines protocol type from response size and delegates to
     * the appropriate parser.
     *
     * @param buffer The response buffer
     * @param rinfo Remote address information
     * @returns Parsed printer information or null if parsing fails
     * @public
     */
    public parseDiscoveryResponse(
        buffer: Buffer,
        rinfo: dgram.RemoteInfo
    ): DiscoveredPrinter | null {
        if (!buffer || buffer.length === 0) {
            return null;
        }

        try {
            // Detect protocol by response size
            if (buffer.length >= MODERN_PROTOCOL_SIZE) {
                return this.parseModernProtocol(buffer, rinfo);
            }

            if (buffer.length >= LEGACY_PROTOCOL_SIZE) {
                return this.parseLegacyProtocol(buffer, rinfo);
            }

            // Log invalid response size but don't throw
            console.warn(
                `Invalid discovery response: ${buffer.length} bytes from ${rinfo.address}`
            );
            return null;
        } catch (error) {
            console.error(`Error parsing discovery response: ${(error as Error).message}`);
            return null;
        }
    }

    /**
     * Parses modern protocol (276-byte) discovery responses.
     *
     * Modern protocol structure:
     * - Printer name: 0x00, 132 bytes, UTF-8
     * - Command port: 0x84, uint16 BE
     * - Vendor ID: 0x86, uint16 BE
     * - Product ID: 0x88, uint16 BE
     * - Product type: 0x8C, uint16 BE
     * - Event port: 0x8E, uint16 BE
     * - Status code: 0x90, uint16 BE
     * - Serial number: 0x92, 130 bytes, UTF-8
     *
     * @param buffer The response buffer (276 bytes)
     * @param rinfo Remote address information
     * @returns Parsed printer information
     * @private
     */
    protected parseModernProtocol(
        buffer: Buffer,
        rinfo: dgram.RemoteInfo
    ): DiscoveredPrinter | null {
        if (buffer.length < MODERN_PROTOCOL_SIZE) {
            throw new InvalidResponseError(buffer.length, rinfo.address);
        }

        // Extract printer name (UTF-8, null-terminated)
        const name = buffer.toString('utf8', 0x00, 0x84).replace(/\0.*$/, '');

        // Extract network configuration (big-endian uint16)
        const commandPort = buffer.readUInt16BE(0x84);
        const vendorId = buffer.readUInt16BE(0x86);
        const productId = buffer.readUInt16BE(0x88);
        const productType = buffer.readUInt16BE(0x8C);
        const eventPort = buffer.readUInt16BE(0x8E);

        // Extract status
        const statusCode = buffer.readUInt16BE(0x90);
        const status = this.mapStatusCode(statusCode);

        // Extract serial number (UTF-8, null-terminated)
        const serialNumber = buffer.toString('utf8', 0x92, 0x92 + 130).replace(/\0.*$/, '');

        // Detect model
        const model = this.detectModernModel(name, productType);

        return {
            model,
            protocolFormat: DiscoveryProtocol.Modern,
            name,
            ipAddress: rinfo.address,
            commandPort,
            serialNumber,
            eventPort,
            vendorId,
            productId,
            productType,
            statusCode,
            status,
        };
    }

    /**
     * Parses legacy protocol (140-byte) discovery responses.
     *
     * Legacy protocol structure:
     * - Printer name: 0x00, 128 bytes, UTF-8
     * - Padding: 0x80, 4 bytes
     * - Command port: 0x84, uint16 BE
     * - Vendor ID: 0x86, uint16 BE
     * - Product ID: 0x88, uint16 BE
     * - Status code: 0x8A, uint16 BE
     *
     * @param buffer The response buffer (140 bytes)
     * @param rinfo Remote address information
     * @returns Parsed printer information
     * @private
     */
    protected parseLegacyProtocol(
        buffer: Buffer,
        rinfo: dgram.RemoteInfo
    ): DiscoveredPrinter | null {
        if (buffer.length < LEGACY_PROTOCOL_SIZE) {
            throw new InvalidResponseError(buffer.length, rinfo.address);
        }

        // Extract printer name (UTF-8, null-terminated)
        const name = buffer.toString('utf8', 0x00, 0x80).replace(/\0.*$/, '');

        // Extract network configuration (big-endian uint16)
        const commandPort = buffer.readUInt16BE(0x84);
        const vendorId = buffer.readUInt16BE(0x86);
        const productId = buffer.readUInt16BE(0x88);

        // Extract status
        const statusCode = buffer.readUInt16BE(0x8A);
        const status = this.mapStatusCode(statusCode);

        // Detect model
        const model = this.detectLegacyModel(name);

        return {
            model,
            protocolFormat: DiscoveryProtocol.Legacy,
            name,
            ipAddress: rinfo.address,
            commandPort,
            vendorId,
            productId,
            statusCode,
            status,
        };
    }

    /**
     * Detects printer model from modern protocol response.
     *
     * Uses both printer name and product type for accurate detection.
     *
     * @param name Printer name from response
     * @param productType Product type code (e.g., 0x5A02 for 5M series)
     * @returns Detected printer model
     * @private
     */
    protected detectModernModel(name: string, productType: number): PrinterModel {
        const upperName = name.toUpperCase();

        // Direct name matches (highest priority)
        if (upperName === 'AD5X') {
            return PrinterModel.AD5X;
        }

        // Product type-based detection (0x5A02 = 5M series)
        if (productType === 0x5A02) {
            if (upperName.includes('PRO')) {
                return PrinterModel.Adventurer5MPro;
            }
            return PrinterModel.Adventurer5M;
        }

        // Name-based fallback
        if (upperName.includes('ADVENTURER 5M') || upperName.includes('AD5M')) {
            if (upperName.includes('PRO')) {
                return PrinterModel.Adventurer5MPro;
            }
            return PrinterModel.Adventurer5M;
        }

        return PrinterModel.Unknown;
    }

    /**
     * Detects printer model from legacy protocol response.
     *
     * Uses printer name heuristics for legacy models.
     *
     * @param name Printer name from response
     * @returns Detected printer model
     * @private
     */
    protected detectLegacyModel(name: string): PrinterModel {
        const upperName = name.toUpperCase();

        if (upperName.includes('ADVENTURER 4') || upperName.includes('ADVENTURER4') || upperName.includes('AD4')) {
            return PrinterModel.Adventurer4;
        }

        if (upperName.includes('ADVENTURER 3') || upperName.includes('ADVENTURER3') || upperName.includes('AD3')) {
            return PrinterModel.Adventurer3;
        }

        return PrinterModel.Unknown;
    }

    /**
     * Maps status code to PrinterStatus enum.
     *
     * @param statusCode Status code from printer response
     * @returns Mapped printer status
     * @private
     */
    protected mapStatusCode(statusCode: number): PrinterStatus {
        switch (statusCode) {
            case 0:
                return PrinterStatus.Ready;
            case 1:
                return PrinterStatus.Busy;
            case 2:
                return PrinterStatus.Error;
            default:
                return PrinterStatus.Unknown;
        }
    }

    /**
     * Retrieves broadcast addresses for all active IPv4 network interfaces.
     *
     * @returns Array of broadcast address strings
     * @private
     */
    protected getBroadcastAddresses(): string[] {
        const broadcastAddresses: string[] = [];
        const interfaces = networkInterfaces();

        for (const [_name, netInterface] of Object.entries(interfaces)) {
            if (!netInterface) continue;

            for (const iface of netInterface) {
                // Skip non-IPv4 and internal/loopback interfaces
                if (iface.family !== 'IPv4' || iface.internal || !iface.netmask) {
                    continue;
                }

                // Calculate broadcast address
                const broadcastAddress = this.calculateBroadcastAddress(iface.address, iface.netmask);
                if (broadcastAddress) {
                    broadcastAddresses.push(broadcastAddress);
                }
            }
        }

        return broadcastAddresses;
    }

    /**
     * Calculates broadcast address from IP address and subnet mask.
     *
     * @param ipAddress IPv4 address string
     * @param subnetMask IPv4 subnet mask string
     * @returns Broadcast address string or null if calculation fails
     * @private
     */
    protected calculateBroadcastAddress(ipAddress: string, subnetMask: string): string | null {
        try {
            const ip = ipAddress.split('.').map(Number);
            const mask = subnetMask.split('.').map(Number);

            if (ip.length !== 4 || mask.length !== 4) {
                return null;
            }

            // Calculate broadcast: IP | (~MASK)
            const broadcast = ip.map((octet, index) => octet | (~mask[index] & 255));
            return broadcast.join('.');
        } catch {
            return null;
        }
    }
}
