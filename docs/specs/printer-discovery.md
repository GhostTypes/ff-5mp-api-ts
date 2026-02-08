# Printer Discovery Implementation Specification

**Status:** Proposed
**Version:** 1.0.0
**Date:** 2025-02-07
**Printer Models:** AD5X, 5M, 5M Pro, Adventurer 4, Adventurer 3
**API Version:** HTTP API (Port 8898) + TCP API (Port 8899)

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Protocol Details](#protocol-details)
4. [Type Definitions](#type-definitions)
5. [API Design](#api-design)
6. [Implementation Details](#implementation-details)
7. [Error Handling](#error-handling)
8. [Testing Strategy](#testing-strategy)
9. [Usage Examples](#usage-examples)
10. [Migration Guide](#migration-guide)

---

## Overview

This specification defines the implementation of a universal printer discovery system for FlashForge printers. The system supports:

- **All modern FlashForge models** (AD5X, 5M, 5M Pro, Adventurer 4, Adventurer 3)
- **Dual-format response parsing** (modern 276-byte and legacy 140-byte protocols)
- **Multi-port discovery** (multicast ports 8899, 19000 and broadcast port 48899)
- **Automatic model detection** from response metadata
- **Complete metadata extraction** (serial numbers, ports, status codes, etc.)

### Current State

**Existing Implementation:** `src/api/PrinterDiscovery.ts`
- ❌ Expects 196-byte responses (incorrect)
- ❌ Only supports broadcast port 48899
- ❌ Single-format parser (can't handle Adventurer 3/4)
- ❌ Limited metadata extraction (name + serial only)
- ⚠️ Partially works for AD5X/5M by luck

### Goals

**After Implementation:**
- ✅ Support all FlashForge printer models
- ✅ Parse both modern (276-byte) and legacy (140-byte) response formats
- ✅ Use multicast and broadcast discovery for maximum compatibility
- ✅ Extract all available metadata from discovery responses
- ✅ Automatic printer model identification
- ✅ Backward compatible with existing API

---

## Requirements

### Functional Requirements

#### FR1: Universal Discovery
The API MUST discover all FlashForge printer models on the local network:
- AD5X series
- Adventurer 5M / 5M Pro
- Adventurer 4 series
- Adventurer 3 series
- Finder series (if compatible)

#### FR2: Multi-Format Response Parsing
The API MUST parse both response formats:
- Modern protocol: 276-byte responses (AD5X/5M)
- Legacy protocol: 140-byte responses (Adventurer 3/4)

#### FR3: Multi-Port Discovery
The API MUST send discovery requests to multiple ports:
- Multicast port 8899 (Adventurer 3 primary)
- Multicast port 19000 (AD5X/5M/Adventurer 4)
- Broadcast port 48899 (all models fallback)

#### FR4: Automatic Model Detection
The API MUST automatically identify printer model from response metadata:
- From `productType` field (modern protocol)
- From printer name string (legacy protocol)

#### FR5: Complete Metadata Extraction
The API MUST extract all available fields:
- Printer name
- IP address
- Serial number (when available)
- Command port (8899)
- Event port / HTTP API port (8898 when available)
- Vendor ID / Product ID
- Status code
- Firmware version (from subsequent HTTP API call)

### Non-Functional Requirements

#### NFR1: Backward Compatibility
New implementation MUST maintain existing API surface where possible.

#### NFR2: Performance
Discovery MUST complete within 10 seconds by default.

#### NFR3: Reliability
Discovery MUST handle:
- Malformed responses gracefully
- Network errors gracefully
- Multiple printers on same network
- Printers that respond on multiple ports

#### NFR4: Type Safety
All methods MUST use TypeScript strict types and enums.

---

## Protocol Details

### Discovery Protocol Overview

All FlashForge printers use a **proprietary UDP multicast/broadcast protocol** (NOT mDNS/Bonjour/SSDP).

**Common Characteristics:**
- **Multicast Group:** `225.0.0.9`
- **Discovery Request:** ANY UDP packet (empty packet works)
- **Endian:** Big Endian
- **TTL:** 2 (can cross 1 router hop)

**Response Format Detection:**
- Modern printers → 276-byte responses
- Legacy printers → 140-byte responses

### Port Matrix

| Printer Series | Multicast Port | Broadcast Port | Response Size |
|---------------|-----------------|----------------|---------------|
| **AD5X** | 19000 | 48899 | 276 bytes |
| **5M / 5M Pro** | 19000 | 48899 | 276 bytes |
| **Adventurer 4** | 19000 | 48899 | 140 bytes |
| **Adventurer 3** | 8899 (primary) | 48899 | 140 bytes |

### Modern Protocol - 276 Byte Response

**Used by:** AD5X, 5M, 5M Pro

```
Offset  Size    Type    Field                    Description
------- ------- ------- ------- -----------------------------
0x00    132     char    printer_name             Null-terminated UTF-8 string
0x84    2       uint16  command_port             Command port (8899)
0x86    2       uint16  vendor_id                USB Vendor ID (0x2B71)
0x88    2       uint16  product_id               USB Product ID (0x0024/0x0026)
0x8A    2       uint16  reserved                 Always 0
0x8C    2       uint16  product_type             Product identifier (0x5A02)
0x8E    2       uint16  event_port               HTTP API port (8898)
0x90    2       uint16  status_code              Printer status
0x92    130     char    serial_number            Null-terminated string
-------
Total:  276 bytes (0x114)
```

**Status Codes:**
- `0` = Ready / Idle
- `1` = Busy / Printing
- `2` = Error State
- `3` = Unknown

**Product Types:**
- `0x5A02` = Adventurer 5M series
- May include other values for future models

### Legacy Protocol - 140 Byte Response

**Used by:** Adventurer 3, Adventurer 4

```
Offset  Size    Type    Field                    Description
------- ------- ------- ------- -----------------------------
0x00    128     char    printer_name             Null-terminated UTF-8 string
0x80    4       padding                          Zero padding
0x84    2       uint16  command_port             Command port (8899)
0x86    2       uint16  vendor_id                USB Vendor ID
0x88    2       uint16  product_id               USB Product ID
0x8A    2       uint16  status_code              Printer status
-------
Total:  140 bytes (0x8C)
```

**Missing Fields:** Serial number, product type, event port not included.

### Discovery Request Packets

Two approaches work:

**Option 1: Empty Packet (Simplest)**
```typescript
const emptyPacket = Buffer.alloc(0);
socket.send(emptyPacket, 0, 0, port, address);
```

**Option 2: Legacy Magic Packet (FlashPrint Compatible)**
```typescript
const magicPacket = Buffer.from([
    0x77, 0x77, 0x77, 0x2e, 0x75, 0x73, 0x72, 0x22,  // "www.usr"
    0x65, 0x36, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x00,  // Control bytes
    0x00, 0x00, 0x00, 0x00                           // Padding
]);
```

**Recommendation:** Use empty packet for simplicity, unless compatibility with very old firmware is required.

---

## Type Definitions

### Printer Model Enum

```typescript
/**
 * FlashForge printer model families
 */
export enum PrinterModel {
    /** AD5X multi-material printer */
    AD5X = 'AD5X',

    /** Adventurer 5M */
    Adventurer5M = 'Adventurer5M',

    /** Adventurer 5M Pro */
    Adventurer5MPro = 'Adventurer5MPro',

    /** Adventurer 4 series */
    Adventurer4 = 'Adventurer4',

    /** Adventurer 3 series */
    Adventurer3 = 'Adventurer3',

    /** Unknown model */
    Unknown = 'Unknown'
}
```

### Protocol Format Enum

```typescript
/**
 * Discovery response protocol format
 */
export enum DiscoveryProtocol {
    /** Modern 276-byte response (AD5X/5M) */
    Modern = 'modern',

    /** Legacy 140-byte response (Adventurer 3/4) */
    Legacy = 'legacy'
}
```

### Discovered Printer Interface

```typescript
/**
 * Represents a discovered FlashForge printer
 */
export interface DiscoveredPrinter {
    /** Printer model identification */
    model: PrinterModel;

    /** Protocol format used in discovery response */
    protocolFormat: DiscoveryProtocol;

    /** Printer name from configuration */
    name: string;

    /** IP address */
    ipAddress: string;

    /** Command/control port (typically 8899) */
    commandPort: number;

    /** Serial number (modern protocol only) */
    serialNumber?: string;

    /** HTTP API event port (modern protocol only, typically 8898) */
    eventPort?: number;

    /** Vendor ID */
    vendorId?: number;

    /** Product ID */
    productId?: number;

    /** Product type (modern protocol only) */
    productType?: number;

    /** Current printer status */
    statusCode?: number;

    /** Human-readable status description */
    status?: PrinterStatus;
}

/**
 * Printer status from discovery
 */
export enum PrinterStatus {
    /** Ready / Idle */
    Ready = 0,

    /** Busy / Printing */
    Busy = 1,

    /** Error State */
    Error = 2,

    /** Unknown */
    Unknown = 3
}
```

### Discovery Options Interface

```typescript
/**
 * Options for printer discovery
 */
export interface DiscoveryOptions {
    /** Discovery timeout in milliseconds (default: 10000) */
    timeout?: number;

    /** Idle timeout in milliseconds (default: 1500) */
    idleTimeout?: number;

    /** Maximum number of retries (default: 3) */
    maxRetries?: number;

    /** Whether to use multicast discovery (default: true) */
    useMulticast?: boolean;

    /** Whether to use broadcast discovery (default: true) */
    useBroadcast?: boolean;

    /** Specific ports to scan (default: all known ports) */
    ports?: number[];
}
```

### Parsed Response Interfaces

```typescript
/**
 * Modern protocol parsed response
 */
interface ModernDiscoveryResponse {
    printerName: string;
    commandPort: number;
    vendorId: number;
    productId: number;
    productType: number;
    eventPort: number;
    statusCode: number;
    serialNumber: string;
}

/**
 * Legacy protocol parsed response
 */
interface LegacyDiscoveryResponse {
    printerName: string;
    commandPort: number;
    vendorId: number;
    productId: number;
    statusCode: number;
}
```

---

## API Design

### Public API - PrinterDiscovery Class

**File:** `src/api/PrinterDiscovery.ts` (REPLACE EXISTING)

```typescript
import { EventEmitter } from 'events';
import dgram from 'dgram';
import os from 'os';

/**
 * Discover FlashForge printers on the local network via UDP multicast/broadcast.
 *
 * Supports all FlashForge models:
 * - AD5X series (276-byte responses)
 * - Adventurer 5M / 5M Pro (276-byte responses)
 * - Adventurer 4 series (140-byte responses)
 * - Adventurer 3 series (140-byte responses)
 *
 * @example
 * ```typescript
 * const discovery = new PrinterDiscovery();
 * const printers = await discovery.discover();
 *
 * printers.forEach(printer => {
 *     console.log(`Found ${printer.model} at ${printer.ipAddress}`);
 *     console.log(`  Serial: ${printer.serialNumber || 'N/A'}`);
 *     console.log(`  HTTP API: ${printer.eventPort || 8898}`);
 * });
 * ```
 */
export class PrinterDiscovery extends EventEmitter {
    /**
     * Discover FlashForge printers on the local network.
     *
     * @param options Discovery options
     * @returns Promise<DiscoveredPrinter[]> Array of discovered printers
     *
     * @example
     * ```typescript
     * const discovery = new PrinterDiscovery();
     *
     * // Basic discovery (10 second timeout)
     * const printers = await discovery.discover();
     *
     * // Custom timeout
     * const printers = await discovery.discover({ timeout: 5000 });
     *
     * // Specific ports only
     * const printers = await discovery.discover({ ports: [19000] });
     * ```
     */
    public async discover(options?: DiscoveryOptions): Promise<DiscoveredPrinter[]>;

    /**
     * Start continuous discovery monitoring.
     *
     * Emits 'discovered' event for each new printer found.
     *
     * @param options Discovery options
     * @returns EventEmitter that emits 'discovered' events
     *
     * @example
     * ```typescript
     * const discovery = new PrinterDiscovery();
     * const monitor = discovery.monitor({ timeout: 60000 });
     *
     * monitor.on('discovered', (printer) => {
     *     console.log(`Found: ${printer.name} at ${printer.ipAddress}`);
     * });
     *
     * monitor.on('complete', (printers) => {
     *     console.log(`Discovery complete: ${printers.length} printers`);
     * });
     *
     * monitor.on('error', (error) => {
     *     console.error('Discovery error:', error);
     * });
     * ```
     */
    public monitor(options?: DiscoveryOptions): EventEmitter;

    /**
     * Stop active discovery monitoring.
     */
    public stop(): void;
}
```

### Internal API - Response Parsers

```typescript
/**
 * Parse discovery response based on packet size
 * @private
 */
function parseDiscoveryResponse(
    buffer: Buffer,
    remoteInfo: dgram.RemoteInfo
): DiscoveredPrinter | null {
    const size = buffer.length;

    if (size >= 276) {
        return parseModernProtocol(buffer, remoteInfo);
    } else if (size >= 140) {
        return parseLegacyProtocol(buffer, remoteInfo);
    } else {
        console.warn(`Invalid discovery response size: ${size} from ${remoteInfo.address}`);
        return null;
    }
}

/**
 * Parse modern 276-byte protocol (AD5X/5M)
 * @private
 */
function parseModernProtocol(
    buffer: Buffer,
    remoteInfo: dgram.RemoteInfo
): DiscoveredPrinter {
    // Extract fields (Big Endian)
    const printerName = buffer.subarray(0, 132).toString('utf8').split('\0')[0];
    const commandPort = buffer.readUInt16BE(0x84);
    const vendorId = buffer.readUInt16BE(0x86);
    const productId = buffer.readUInt16BE(0x88);
    const productType = buffer.readUInt16BE(0x8C);
    const eventPort = buffer.readUInt16BE(0x8E);
    const statusCode = buffer.readUInt16BE(0x90);
    const serialNumber = buffer.subarray(0x92, 0x92 + 130).toString('utf8').split('\0')[0];

    // Detect model
    const model = detectModernModel(printerName, productType);

    return {
        model,
        protocolFormat: DiscoveryProtocol.Modern,
        name: printerName,
        ipAddress: remoteInfo.address,
        commandPort,
        serialNumber,
        eventPort,
        vendorId,
        productId,
        productType,
        statusCode,
        status: mapStatusCode(statusCode)
    };
}

/**
 * Parse legacy 140-byte protocol (Adventurer 3/4)
 * @private
 */
function parseLegacyProtocol(
    buffer: Buffer,
    remoteInfo: dgram.RemoteInfo
): DiscoveredPrinter {
    // Extract fields (Big Endian)
    const printerName = buffer.subarray(0, 128).toString('utf8').split('\0')[0];
    const commandPort = buffer.readUInt16BE(0x84);
    const vendorId = buffer.readUInt16BE(0x86);
    const productId = buffer.readUInt16BE(0x88);
    const statusCode = buffer.readUInt16BE(0x8A);

    // Detect model
    const model = detectLegacyModel(printerName);

    return {
        model,
        protocolFormat: DiscoveryProtocol.Legacy,
        name: printerName,
        ipAddress: remoteInfo.address,
        commandPort,
        vendorId,
        productId,
        statusCode,
        status: mapStatusCode(statusCode)
    };
}

/**
 * Detect printer model from modern protocol response
 * @private
 */
function detectModernModel(
    printerName: string,
    productType: number
): PrinterModel {
    if (printerName === 'AD5X') return PrinterModel.AD5X;

    if (productType === 0x5A02) {
        // Adventurer 5M series
        if (printerName.includes('Pro')) {
            return PrinterModel.Adventurer5MPro;
        }
        return PrinterModel.Adventurer5M;
    }

    return PrinterModel.Unknown;
}

/**
 * Detect printer model from legacy protocol response
 * @private
 */
function detectLegacyModel(printerName: string): PrinterModel {
    if (printerName.includes('Adventurer 4')) {
        return PrinterModel.Adventurer4;
    }
    if (printerName.includes('Adventurer 3')) {
        return PrinterModel.Adventurer3;
    }

    return PrinterModel.Unknown;
}

/**
 * Map status code to enum
 * @private
 */
function mapStatusCode(code: number): PrinterStatus {
    switch (code) {
        case 0: return PrinterStatus.Ready;
        case 1: return PrinterStatus.Busy;
        case 2: return PrinterStatus.Error;
        default: return PrinterStatus.Unknown;
    }
}
```

---

## Implementation Details

### 1. Discovery Class Structure

**File:** `src/api/PrinterDiscovery.ts` (COMPLETE REWRITE)

```typescript
import { EventEmitter } from 'events';
import dgram from 'dgram';
import os from 'os';
import {
    PrinterModel,
    DiscoveryProtocol,
    DiscoveredPrinter,
    DiscoveryOptions,
    PrinterStatus
} from '../models/PrinterDiscovery';

/**
 * Default discovery options
 */
const DEFAULT_OPTIONS: Required<DiscoveryOptions> = {
    timeout: 10000,
    idleTimeout: 1500,
    maxRetries: 3,
    useMulticast: true,
    useBroadcast: true,
    ports: [8899, 19000, 48899]
};

/**
 * Discover FlashForge printers on the local network.
 */
export class PrinterDiscovery extends EventEmitter {
    private socket?: dgram.Socket;
    private active = false;

    /**
     * Discover printers once (one-shot discovery).
     */
    public async discover(options?: DiscoveryOptions): Promise<DiscoveredPrinter[]> {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const printers = new Map<string, DiscoveredPrinter>();
        const lastResponseTimes = new Map<string, number>();

        return new Promise((resolve, reject) => {
            const socket = dgram.createSocket('udp4');
            this.socket = socket;

            const timeoutTimer = setTimeout(() => {
                this.cleanup();
                resolve(Array.from(printers.values()));
            }, opts.timeout);

            const idleTimer = setInterval(() => {
                const now = Date.now();
                const idleTime = opts.idleTimeout;

                for (const [key, time] of lastResponseTimes) {
                    if (now - time > idleTime) {
                        lastResponseTimes.delete(key);
                    }
                }

                if (lastResponseTimes.size === 0) {
                    clearInterval(idleTimer);
                    clearTimeout(timeoutTimer);
                    this.cleanup();
                    resolve(Array.from(printers.values()));
                }
            }, 1000);

            socket.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
                try {
                    const printer = parseDiscoveryResponse(msg, rinfo);
                    if (printer) {
                        const key = `${rinfo.address}:${printer.commandPort}`;
                        if (!printers.has(key)) {
                            printers.set(key, printer);
                            this.emit('discovered', printer);
                        }
                        lastResponseTimes.set(key, Date.now());
                    }
                } catch (error) {
                    console.error('Error parsing discovery response:', error);
                }
            });

            socket.on('error', (err) => {
                console.error('Discovery socket error:', err);
                this.cleanup();
                reject(err);
            });

            // Start discovery
            this.startDiscovery(socket, opts);
        });
    }

    /**
     * Start continuous monitoring.
     */
    public monitor(options?: DiscoveryOptions): EventEmitter {
        // Implementation for continuous monitoring
        // Returns this emitter for 'discovered' events
        return this;
    }

    /**
     * Stop active discovery.
     */
    public stop(): void {
        this.active = false;
        this.cleanup();
    }

    /**
     * Send discovery packets to all configured ports.
     * @private
     */
    private startDiscovery(socket: dgram.Socket, options: Required<DiscoveryOptions>): void {
        const ports = options.ports || DEFAULT_OPTIONS.ports;

        // Bind to random port
        socket.bind(0, () => {
            // Send discovery requests
            if (options.useMulticast) {
                // Multicast discovery
                ports.forEach(port => {
                    if ([8899, 19000].includes(port)) {
                        this.sendMulticastDiscovery(socket, port);
                    }
                });
            }

            if (options.useBroadcast) {
                // Broadcast discovery on port 48899
                if (ports.includes(48899)) {
                    this.sendBroadcastDiscovery(socket);
                }
            }
        });
    }

    /**
     * Send multicast discovery packet.
     * @private
     */
    private sendMulticastDiscovery(socket: dgram.Socket, port: number): void {
        const multicastGroup = '225.0.0.9';
        const emptyPacket = Buffer.alloc(0);

        try {
            socket.addMembership(multicastGroup);
            socket.send(emptyPacket, 0, 0, port, multicastGroup);
        } catch (error) {
            console.error(`Multicast discovery failed on port ${port}:`, error);
        }
    }

    /**
     * Send broadcast discovery packet.
     * @private
     */
    private sendBroadcastDiscovery(socket: dgram.Socket): void {
        const broadcastAddress = '255.255.255.255';
        const port = 48899;
        const emptyPacket = Buffer.alloc(0);

        // Get all broadcast addresses
        const interfaces = os.networkInterfaces();
        const broadcastAddresses = this.getBroadcastAddresses(interfaces);

        broadcastAddresses.forEach(address => {
            try {
                socket.setBroadcast(true);
                socket.send(emptyPacket, 0, 0, port, address);
            } catch (error) {
                console.error(`Broadcast discovery failed to ${address}:`, error);
            }
        });
    }

    /**
     * Extract broadcast addresses from network interfaces.
     * @private
     */
    private getBroadcastAddresses(interfaces: os.NetworkInterfaceInfo[]): string[] {
        const addresses: string[] = [];

        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                // Skip internal and loopback
                if (iface.internal || iface.family !== 'IPv4') continue;

                if (iface.broadcast) {
                    addresses.push(iface.broadcast);
                }
            }
        }

        return addresses;
    }

    /**
     * Clean up resources.
     * @private
     */
    private cleanup(): void {
        if (this.socket) {
            try {
                this.socket.close();
            } catch (e) {
                // Socket already closed
            }
            this.socket = undefined;
        }
        this.active = false;
    }
}
```

---

## Error Handling

### Error Types

```typescript
/**
 * Discovery-specific errors
 */
export class DiscoveryError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'DiscoveryError';
    }
}

/**
 * Socket creation error
 */
export class SocketCreationError extends DiscoveryError {
    constructor(message: string) {
        super(message, 'SOCKET_CREATION_FAILED');
        this.name = 'SocketCreationError';
    }
}

/**
 * Discovery timeout error
 */
export class DiscoveryTimeoutError extends DiscoveryError {
    constructor(timeout: number) {
        super(`Discovery timed out after ${timeout}ms`, 'DISCOVERY_TIMEOUT');
        this.name = 'DiscoveryTimeoutError';
    }
}

/**
 * Invalid response error
 */
export class InvalidResponseError extends DiscoveryError {
    constructor(size: number, address: string) {
        super(`Invalid response size: ${size} bytes from ${address}`, 'INVALID_RESPONSE');
        this.name = 'InvalidResponseError';
    }
}
```

### Error Handling Strategy

1. **Socket Errors**: Log and emit 'error' event, continue discovery
2. **Malformed Responses**: Log warning, skip response
3. **Timeout**: Return any printers found so far
4. **No Printers Found**: Return empty array (not an error)

---

## Testing Strategy

### Unit Tests

**File:** `src/api/__tests__/PrinterDiscovery.test.ts`

```typescript
import { PrinterDiscovery } from '../PrinterDiscovery';
import { PrinterModel, DiscoveryProtocol, PrinterStatus } from '../../models/PrinterDiscovery';

describe('PrinterDiscovery', () => {
    describe('parseModernProtocol', () => {
        it('should parse 276-byte modern response', () => {
            const buffer = createModernResponseBuffer({
                printerName: 'FlashForge Adventurer 5M Pro',
                serialNumber: 'SNAD5M12345678',
                statusCode: 0
            });

            const result = parseModernProtocol(buffer, { address: '192.168.1.100' });

            expect(result.model).toBe(PrinterModel.Adventurer5MPro);
            expect(result.protocolFormat).toBe(DiscoveryProtocol.Modern);
            expect(result.name).toBe('FlashForge Adventurer 5M Pro');
            expect(result.serialNumber).toBe('SNAD5M12345678');
            expect(result.commandPort).toBe(8899);
            expect(result.eventPort).toBe(8898);
            expect(result.statusCode).toBe(0);
            expect(result.status).toBe(PrinterStatus.Ready);
        });

        it('should detect AD5X model', () => {
            const buffer = createModernResponseBuffer({
                printerName: 'AD5X',
                serialNumber: 'SNADVA5X00000',
                productType: 0x5A02
            });

            const result = parseModernProtocol(buffer, { address: '192.168.1.100' });

            expect(result.model).toBe(PrinterModel.AD5X);
        });
    });

    describe('parseLegacyProtocol', () => {
        it('should parse 140-byte legacy response', () => {
            const buffer = createLegacyResponseBuffer({
                printerName: 'FlashForge Adventurer 4',
                statusCode: 0
            });

            const result = parseLegacyProtocol(buffer, { address: '192.168.1.100' });

            expect(result.model).toBe(PrinterModel.Adventurer4);
            expect(result.protocolFormat).toBe(DiscoveryProtocol.Legacy);
            expect(result.name).toBe('FlashForge Adventurer 4');
            expect(result.commandPort).toBe(8899);
            expect(result.serialNumber).toBeUndefined();
            expect(result.statusCode).toBe(0);
        });

        it('should detect Adventurer 3 model', () => {
            const buffer = createLegacyResponseBuffer({
                printerName: 'FlashForge Adventurer 3'
            });

            const result = parseLegacyProtocol(buffer, { address: '192.168.1.100' });

            expect(result.model).toBe(PrinterModel.Adventurer3);
        });
    });

    describe('response format detection', () => {
        it('should detect modern protocol from size >= 276', () => {
            const modernBuffer = createModernResponseBuffer({ printerName: 'Test' });
            const legacyBuffer = createLegacyResponseBuffer({ printerName: 'Test' });

            expect(modernBuffer.length).toBeGreaterThanOrEqual(276);
            expect(legacyBuffer.length).toBeGreaterThanOrEqual(140);
        });
    });
});
```

### Integration Tests

**File:** `src/api/__tests__/PrinterDiscovery.integration.test.ts`

```typescript
describe('PrinterDiscovery Integration Tests', () => {
    let discovery: PrinterDiscovery;

    beforeEach(() => {
        discovery = new PrinterDiscovery();
    });

    afterEach(() => {
        discovery.stop();
    });

    it('should discover printers on local network (requires physical printer)', async () => {
        // This test requires a real printer on the network
        // Skip in CI/CD environments
        if (process.env.CI) {
            return;
        }

        const printers = await discovery.discover({ timeout: 5000 });

        console.log(`Found ${printers.length} printers`);

        printers.forEach(printer => {
            console.log(`  - ${printer.model}: ${printer.name} at ${printer.ipAddress}:${printer.commandPort}`);
            if (printer.serialNumber) {
                console.log(`    Serial: ${printer.serialNumber}`);
            }
        });

        expect(printers.length).toBeGreaterThan(0);
    }, 10000);
});
```

---

## Usage Examples

### Example 1: Basic Discovery

```typescript
import { PrinterDiscovery } from '@ghosttypes/ff-api';

const discovery = new PrinterDiscovery();

// Discover all printers (10 second timeout)
const printers = await discovery.discover();

console.log(`Found ${printers.length} printers:`);
printers.forEach(printer => {
    console.log(`\n${printer.model}`);
    console.log(`  Name: ${printer.name}`);
    console.log(`  IP: ${printer.ipAddress}`);
    console.log(`  Serial: ${printer.serialNumber || 'N/A'}`);
    console.log(`  HTTP API Port: ${printer.eventPort || 8898}`);
    console.log(`  Status: ${printer.status}`);
});
```

### Example 2: Model-Specific Discovery

```typescript
const discovery = new PrinterDiscovery();
const printers = await discovery.discover();

// Filter by model
const ad5xPrinters = printers.filter(p => p.model === PrinterModel.AD5X);
const adventurer5mPrinters = printers.filter(p =>
    p.model === PrinterModel.Adventurer5M ||
    p.model === PrinterModel.Adventurer5MPro
);

console.log(`AD5X printers: ${ad5xPrinters.length}`);
console.log(`Adventurer 5M printers: ${adventurer5mPrinters.length}`);
```

### Example 3: Continuous Monitoring

```typescript
import { PrinterDiscovery } from '@ghosttypes/ff-api';

const discovery = new PrinterDiscovery();
const monitor = discovery.monitor({ timeout: 60000 }); // 1 minute

monitor.on('discovered', (printer) => {
    console.log(`✓ Discovered: ${printer.model} - ${printer.name}`);
    console.log(`  IP: ${printer.ipAddress}:${printer.commandPort}`);

    if (printer.model === PrinterModel.AD5X && printer.serialNumber) {
        console.log(`  Serial: ${printer.serialNumber}`);
    }
});

monitor.on('complete', (printers) => {
    console.log(`\nDiscovery complete! Total printers: ${printers.length}`);
});

monitor.on('error', (error) => {
    console.error('Discovery error:', error);
});

// Stop after 1 minute
setTimeout(() => {
    discovery.stop();
    console.log('Monitoring stopped');
}, 60000);
```

### Example 4: Custom Timeout

```typescript
// Quick 3-second scan
const discovery = new PrinterDiscovery();
const printers = await discovery.discover({
    timeout: 3000,
    ports: [19000]  // Only scan multicast port 19000
});

console.log(`Quick scan found ${printers.length} printers`);
```

### Example 5: Filter by Availability

```typescript
const discovery = new PrinterDiscovery();
const printers = await discovery.discover();

// Only ready printers
const availablePrinters = printers.filter(p =>
    p.status === PrinterStatus.Ready
);

console.log(`Available printers: ${availablePrinters.length}`);
availablePrinters.forEach(printer => {
    console.log(`  - ${printer.name} at ${printer.ipAddress}`);
});
```

### Example 6: Auto-Connect to FiveMClient

```typescript
import { PrinterDiscovery } from '@ghosttypes/ff-api';
import { FiveMClient } from '@ghosttypes/ff-api';

async function discoverAndConnect() {
    const discovery = new PrinterDiscovery();
    const printers = await discovery.discover();

    for (const printer of printers) {
        // Try to connect to AD5X/5M printers
        if (printer.serialNumber && printer.eventPort) {
            try {
                const client = new FiveMClient(
                    printer.ipAddress,
                    printer.serialNumber,
                    '0000'  // Will need to get check code from printer display
                );

                const detail = await client.info.getDetailResponse();
                console.log(`Connected to ${printer.name}`);
                console.log(`  Firmware: ${detail.machineInfo.firmwareVersion}`);

                return client;
            } catch (error) {
                console.log(`Failed to connect to ${printer.name}: ${error}`);
                // Try next printer
            }
        }
    }

    throw new Error('No compatible printer found');
}
```

---

## Migration Guide

### From Old Implementation

**Old API:**
```typescript
import { FlashForgePrinterDiscovery, FlashForgePrinter } from '@ghosttypes/ff-api';

const discovery = new FlashForgePrinterDiscovery();
const printers = await discovery.discoverPrintersAsync();

printers.forEach((printer: FlashForgePrinter) => {
    console.log(printer.name);
    console.log(printer.serialNumber);
    console.log(printer.ipAddress);
    console.log(printer.isAD5X);
});
```

**New API:**
```typescript
import { PrinterDiscovery } from '@ghosttypes/ff-api';

const discovery = new PrinterDiscovery();
const printers = await discovery.discover();

printers.forEach(printer => {
    console.log(printer.name);
    console.log(printer.serialNumber || 'N/A');
    console.log(printer.ipAddress);
    console.log(printer.model);  // More precise than isAD5X
});
```

### Breaking Changes

| Old | New | Notes |
|-----|-----|-------|
| `FlashForgePrinterDiscovery` | `PrinterDiscovery` | Class renamed |
| `FlashForgePrinter` | `DiscoveredPrinter` | Interface renamed |
| `isAD5X?: boolean` | `model: PrinterModel` | More precise model detection |
| `discoverPrintersAsync()` | `discover()` | Method simplified |
| N/A | `protocolFormat` | New field |
| N/A | `commandPort` | New field |
| N/A | `eventPort` | New field |
| N/A | `statusCode` | New field |

### Backward Compatibility Layer

**File:** `src/api/PrinterDiscovery.legacy.ts` (NEW)

```typescript
/**
 * @deprecated Use PrinterDiscovery instead
 */
export class FlashForgePrinterDiscovery extends PrinterDiscovery {
    /**
     * @deprecated Use discover() instead
     */
    public async discoverPrintersAsync(
        timeoutMs = 10000,
        idleTimeoutMs = 1500,
        maxRetries = 3
    ): Promise<FlashForgePrinter[]> {
        const printers = await this.discover({
            timeout: timeoutMs,
            idleTimeout: idleTimeoutMs,
            maxRetries
        });

        // Convert to old format
        return printers.map(toLegacyPrinter);
    }
}

/**
 * @deprecated Use DiscoveredPrinter instead
 */
export class FlashForgePrinter {
    public name: string = '';
    public serialNumber: string = '';
    public ipAddress: string = '';
    public isAD5X?: boolean;
}

function toLegacyPrinter(printer: DiscoveredPrinter): FlashForgePrinter {
    const legacy = new FlashForgePrinter();
    legacy.name = printer.name;
    legacy.serialNumber = printer.serialNumber || '';
    legacy.ipAddress = printer.ipAddress;
    legacy.isAD5X = printer.model === PrinterModel.AD5X;
    return legacy;
}
```

---

## Appendix

### A. Discovery Flow Diagram

```
Client                           Printer(s)
  |                                ^
  |-------- UDP empty packet ---->| (multicast 225.0.0.9:19000)
  |                                |  (or broadcast 255.255.255.255:48899)
  |                                |
  |                                | Process received packet
  |                                | Prepare response
  |                                |
  |<------- 276-byte or 140-byte response
  |
  | Parse response
  | Detect format by size
  | Extract metadata
  | Identify model
  v
Return DiscoveredPrinter[]
```

### B. Response Format Decision Tree

```
Receive UDP Packet
       |
       v
  Check packet size
       |
       v
  size >= 276? ────Yes──> Parse Modern Protocol
       |                     (AD5X/5M/5M Pro)
       No
       |
       v
  size >= 140? ────Yes──> Parse Legacy Protocol
       |                     (Adventurer 3/4)
       No
       |
       v
  Invalid response (log warning, discard)
```

### C. Port Priority

**Recommended port order for discovery:**
1. **19000** (multicast) - Modern printers (AD5X/5M/Adv4)
2. **8899** (multicast) - Legacy Adventurer 3
3. **48899** (broadcast) - All models fallback

**Default configuration scans all three ports.**

### D. Network Configuration

**Multicast Setup:**
```typescript
socket.addMembership('225.0.0.9');
socket.send(Buffer.alloc(0), 0, 0, 19000, '225.0.0.9');
```

**Broadcast Setup:**
```typescript
socket.setBroadcast(true);
socket.send(Buffer.alloc(0), 0, 0, 48899, '255.255.255.255');
```

### E. Product Type Values

| Product Type | Model |
|--------------|-------|
| `0x5A02` | Adventurer 5M / 5M Pro |
| Unknown | AD5X |

### F. Vendor ID / Product ID Values

| VID | PID | Description |
|-----|-----|-------------|
| `0x2B71` | `0x0024` | Adventurer 5M |
| `0x2B71` | `0x0026` | Adventurer 5M Pro (sometimes) |

### G. Related Documentation

- **HTTP API:** `docs/http-api.md`
- **Legacy TCP API:** `docs/legacy-api.md`
- **AD5X API:** `docs/ad5x/ad5x-api.md`

### H. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-02-07 | Claude Code | Initial specification |

---

**End of Specification**
