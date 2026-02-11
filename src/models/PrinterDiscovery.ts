/**
 * @fileoverview Type definitions for FlashForge printer discovery system.
 *
 * Provides enums and interfaces for universal printer discovery supporting
 * all FlashForge models (AD5X, 5M, 5M Pro, Adventurer 4, Adventurer 3) through
 * multi-port, multi-format UDP discovery.
 */

/**
 * FlashForge printer model enumeration.
 * Identifies specific printer models based on name and product type information.
 */
export enum PrinterModel {
    /** Adventurer 5X (AD5X) with Intelligent Filament Station */
    AD5X = 'AD5X',
    /** Adventurer 5M standard model */
    Adventurer5M = 'Adventurer5M',
    /** Adventurer 5M Pro model */
    Adventurer5MPro = 'Adventurer5MPro',
    /** Adventurer 4 model */
    Adventurer4 = 'Adventurer4',
    /** Adventurer 3 model */
    Adventurer3 = 'Adventurer3',
    /** Unknown or unrecognized printer model */
    Unknown = 'Unknown'
}

/**
 * Discovery protocol format enumeration.
 * Indicates whether a printer response uses the modern or legacy protocol.
 */
export enum DiscoveryProtocol {
    /** Modern protocol: 276-byte responses from AD5X, 5M, 5M Pro */
    Modern = 'modern',
    /** Legacy protocol: 140-byte responses from Adventurer 3, Adventurer 4 */
    Legacy = 'legacy'
}

/**
 * Printer status enumeration.
 * Represents the current operational state of a discovered printer.
 */
export enum PrinterStatus {
    /** Printer is ready to accept print jobs */
    Ready = 0,
    /** Printer is busy (printing, heating, or processing) */
    Busy = 1,
    /** Printer is in an error state */
    Error = 2,
    /** Printer status could not be determined */
    Unknown = 3
}

/**
 * Represents a discovered FlashForge printer with all available metadata.
 * Contains information extracted from UDP discovery responses including identification,
 * network configuration, and current status.
 */
export interface DiscoveredPrinter {
    /** Printer model identifier */
    model: PrinterModel;
    /** Protocol format used in discovery response */
    protocolFormat: DiscoveryProtocol;
    /** Printer name (UTF-8 encoded) */
    name: string;
    /** IP address for command communication */
    ipAddress: string;
    /** TCP port for G-code commands (typically 8899) */
    commandPort: number;
    /** Serial number (modern protocol only) */
    serialNumber?: string;
    /** HTTP API event port (modern protocol only, typically 8898) */
    eventPort?: number;
    /** USB vendor ID */
    vendorId?: number;
    /** USB product ID */
    productId?: number;
    /** Product type from modern protocol (e.g., 0x5A02 for 5M series) */
    productType?: number;
    /** Status code from printer */
    statusCode?: number;
    /** Decoded printer status */
    status?: PrinterStatus;
}

/**
 * Configuration options for printer discovery.
 * Allows customization of discovery behavior including timeouts, retry logic,
 * and which discovery methods to use.
 */
export interface DiscoveryOptions {
    /** Total time in milliseconds to wait for responses (default: 10000) */
    timeout?: number;
    /** Idle time in milliseconds to wait after last response before stopping (default: 1500) */
    idleTimeout?: number;
    /** Maximum number of discovery retry attempts (default: 3) */
    maxRetries?: number;
    /** Whether to use multicast discovery on ports 8899 and 19000 (default: true) */
    useMulticast?: boolean;
    /** Whether to use broadcast discovery on local subnet addresses (default: true) */
    useBroadcast?: boolean;
    /** Specific ports to use for discovery (default: [8899, 19000, 48899]) */
    ports?: number[];
}
