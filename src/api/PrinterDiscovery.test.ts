/**
 * @fileoverview Comprehensive test suite for FlashForge printer discovery.
 *
 * Tests protocol parsers (modern 276-byte, legacy 140-byte), model detection,
 * status mapping, multi-port discovery, timeout handling, deduplication,
 * and monitor/event behavior.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type * as dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import { PrinterDiscovery } from './PrinterDiscovery';
import {
    DiscoveryProtocol,
    PrinterModel,
    PrinterStatus,
    type DiscoveredPrinter,
    type DiscoveryOptions,
} from '../models/PrinterDiscovery';
import { InvalidResponseError } from './network/DiscoveryErrors';

// Suppress logs during tests
const originalConsole = { ...console };
beforeAll(() => {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
});

afterAll(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
});

describe('PrinterDiscovery', () => {
    // Helper to create a test discovery instance
    const createDiscovery = (): PrinterDiscovery => {
        return new PrinterDiscovery();
    };

    // Helper to create mock modern protocol buffer
    const createModernBuffer = (overrides: {
        name?: string;
        commandPort?: number;
        vendorId?: number;
        productId?: number;
        productType?: number;
        eventPort?: number;
        statusCode?: number;
        serialNumber?: string;
    }): Buffer => {
        const buffer = Buffer.alloc(276);

        // Default values
        const name = overrides.name ?? 'Adventurer 5M';
        const commandPort = overrides.commandPort ?? 8899;
        const vendorId = overrides.vendorId ?? 0x0403;
        const productId = overrides.productId ?? 0x6001;
        const productType = overrides.productType ?? 0x5A02;
        const eventPort = overrides.eventPort ?? 8898;
        const statusCode = overrides.statusCode ?? 0;
        const serialNumber = overrides.serialNumber ?? 'SN123456';

        // Write printer name (UTF-8, null-terminated)
        buffer.write(name, 0, 'utf8');
        buffer.fill(0, name.length, 0x84);

        // Write network configuration (big-endian uint16)
        buffer.writeUInt16BE(commandPort, 0x84);
        buffer.writeUInt16BE(vendorId, 0x86);
        buffer.writeUInt16BE(productId, 0x88);
        buffer.writeUInt16BE(productType, 0x8C);
        buffer.writeUInt16BE(eventPort, 0x8E);
        buffer.writeUInt16BE(statusCode, 0x90);

        // Write serial number (UTF-8, null-terminated)
        buffer.write(serialNumber, 0x92, 'utf8');
        buffer.fill(0, 0x92 + serialNumber.length, 0x92 + 130);

        return buffer;
    };

    // Helper to create mock legacy protocol buffer
    const createLegacyBuffer = (overrides: {
        name?: string;
        commandPort?: number;
        vendorId?: number;
        productId?: number;
        statusCode?: number;
    }): Buffer => {
        const buffer = Buffer.alloc(140);

        // Default values
        const name = overrides.name ?? 'Adventurer 3';
        const commandPort = overrides.commandPort ?? 8899;
        const vendorId = overrides.vendorId ?? 0x0403;
        const productId = overrides.productId ?? 0x6001;
        const statusCode = overrides.statusCode ?? 0;

        // Write printer name (UTF-8, null-terminated)
        buffer.write(name, 0, 'utf8');
        buffer.fill(0, name.length, 0x80);

        // Padding at 0x80 (4 bytes) - already zeroed

        // Write network configuration (big-endian uint16)
        buffer.writeUInt16BE(commandPort, 0x84);
        buffer.writeUInt16BE(vendorId, 0x86);
        buffer.writeUInt16BE(productId, 0x88);
        buffer.writeUInt16BE(statusCode, 0x8A);

        return buffer;
    };

    describe('Modern Protocol Parser', () => {
        it('should parse AD5X response correctly', () => {
            const discovery = createDiscovery();
            const buffer = createModernBuffer({
                name: 'AD5X',
                productType: 0x5A02,
                serialNumber: 'AD5X123456',
            });

            const result = discovery['parseModernProtocol'](buffer, {
                address: '192.168.1.100',
                port: 8899,
                family: 'IPv4',
                size: 276,
            });

            expect(result).not.toBeNull();
            expect(result?.model).toBe(PrinterModel.AD5X);
            expect(result?.name).toBe('AD5X');
            expect(result?.serialNumber).toBe('AD5X123456');
            expect(result?.ipAddress).toBe('192.168.1.100');
            expect(result?.commandPort).toBe(8899);
            expect(result?.eventPort).toBe(8898);
            expect(result?.protocolFormat).toBe(DiscoveryProtocol.Modern);
            expect(result?.productType).toBe(0x5A02);
        });

        it('should parse Adventurer 5M Pro response correctly', () => {
            const discovery = createDiscovery();
            const buffer = createModernBuffer({
                name: 'Adventurer 5M Pro',
                productType: 0x5A02,
            });

            const result = discovery['parseModernProtocol'](buffer, {
                address: '192.168.1.101',
                port: 8899,
                family: 'IPv4',
                size: 276,
            });

            expect(result?.model).toBe(PrinterModel.Adventurer5MPro);
            expect(result?.name).toBe('Adventurer 5M Pro');
            expect(result?.productType).toBe(0x5A02);
        });

        it('should parse Adventurer 5M response correctly', () => {
            const discovery = createDiscovery();
            const buffer = createModernBuffer({
                name: 'Adventurer 5M',
                productType: 0x5A02,
            });

            const result = discovery['parseModernProtocol'](buffer, {
                address: '192.168.1.102',
                port: 8899,
                family: 'IPv4',
                size: 276,
            });

            expect(result?.model).toBe(PrinterModel.Adventurer5M);
            expect(result?.name).toBe('Adventurer 5M');
        });

        it('should extract all fields from modern protocol', () => {
            const discovery = createDiscovery();
            const buffer = createModernBuffer({
                name: 'Test Printer',
                commandPort: 9100,
                vendorId: 0x1234,
                productId: 0x5678,
                productType: 0xABCD,
                eventPort: 9200,
                statusCode: 1,
                serialNumber: 'TESTSN001',
            });

            const result = discovery['parseModernProtocol'](buffer, {
                address: '10.0.0.50',
                port: 8899,
                family: 'IPv4',
                size: 276,
            });

            expect(result?.commandPort).toBe(9100);
            expect(result?.vendorId).toBe(0x1234);
            expect(result?.productId).toBe(0x5678);
            expect(result?.productType).toBe(0xABCD);
            expect(result?.eventPort).toBe(9200);
            expect(result?.statusCode).toBe(1);
            expect(result?.status).toBe(PrinterStatus.Busy);
            expect(result?.serialNumber).toBe('TESTSN001');
        });

        it('should throw InvalidResponseError for undersized buffer', () => {
            const discovery = createDiscovery();
            const buffer = Buffer.alloc(100); // Too small

            expect(() => {
                discovery['parseModernProtocol'](buffer, {
                    address: '192.168.1.100',
                    port: 8899,
                    family: 'IPv4',
                    size: 100,
                });
            }).toThrow(InvalidResponseError);
        });
    });

    describe('Legacy Protocol Parser', () => {
        it('should parse Adventurer 4 response correctly', () => {
            const discovery = createDiscovery();
            const buffer = createLegacyBuffer({
                name: 'Adventurer 4',
            });

            const result = discovery['parseLegacyProtocol'](buffer, {
                address: '192.168.1.200',
                port: 8899,
                family: 'IPv4',
                size: 140,
            });

            expect(result).not.toBeNull();
            expect(result?.model).toBe(PrinterModel.Adventurer4);
            expect(result?.name).toBe('Adventurer 4');
            expect(result?.ipAddress).toBe('192.168.1.200');
            expect(result?.commandPort).toBe(8899);
            expect(result?.protocolFormat).toBe(DiscoveryProtocol.Legacy);
            expect(result?.serialNumber).toBeUndefined();
            expect(result?.eventPort).toBeUndefined();
        });

        it('should parse Adventurer 3 response correctly', () => {
            const discovery = createDiscovery();
            const buffer = createLegacyBuffer({
                name: 'Adventurer 3',
            });

            const result = discovery['parseLegacyProtocol'](buffer, {
                address: '192.168.1.201',
                port: 8899,
                family: 'IPv4',
                size: 140,
            });

            expect(result?.model).toBe(PrinterModel.Adventurer3);
            expect(result?.name).toBe('Adventurer 3');
        });

        it('should extract all fields from legacy protocol', () => {
            const discovery = createDiscovery();
            const buffer = createLegacyBuffer({
                name: 'Legacy Printer',
                commandPort: 9100,
                vendorId: 0x1234,
                productId: 0x5678,
                statusCode: 2,
            });

            const result = discovery['parseLegacyProtocol'](buffer, {
                address: '10.0.0.100',
                port: 8899,
                family: 'IPv4',
                size: 140,
            });

            expect(result?.commandPort).toBe(9100);
            expect(result?.vendorId).toBe(0x1234);
            expect(result?.productId).toBe(0x5678);
            expect(result?.statusCode).toBe(2);
            expect(result?.status).toBe(PrinterStatus.Error);
        });

        it('should throw InvalidResponseError for undersized buffer', () => {
            const discovery = createDiscovery();
            const buffer = Buffer.alloc(50); // Too small

            expect(() => {
                discovery['parseLegacyProtocol'](buffer, {
                    address: '192.168.1.200',
                    port: 8899,
                    family: 'IPv4',
                    size: 50,
                });
            }).toThrow(InvalidResponseError);
        });
    });

    describe('Status Code Mapping', () => {
        it('should map status code 0 to Ready', () => {
            const discovery = createDiscovery();
            expect(discovery['mapStatusCode'](0)).toBe(PrinterStatus.Ready);
        });

        it('should map status code 1 to Busy', () => {
            const discovery = createDiscovery();
            expect(discovery['mapStatusCode'](1)).toBe(PrinterStatus.Busy);
        });

        it('should map status code 2 to Error', () => {
            const discovery = createDiscovery();
            expect(discovery['mapStatusCode'](2)).toBe(PrinterStatus.Error);
        });

        it('should map unknown status codes to Unknown', () => {
            const discovery = createDiscovery();
            expect(discovery['mapStatusCode'](99)).toBe(PrinterStatus.Unknown);
            expect(discovery['mapStatusCode'](-1)).toBe(PrinterStatus.Unknown);
        });
    });

    describe('Model Detection', () => {
        describe('Modern Protocol', () => {
            it('should detect AD5X by name', () => {
                const discovery = createDiscovery();
                expect(discovery['detectModernModel']('AD5X', 0x5A02)).toBe(PrinterModel.AD5X);
                expect(discovery['detectModernModel']('AD5X', 0x0000)).toBe(PrinterModel.AD5X);
            });

            it('should detect 5M Pro by product type and name', () => {
                const discovery = createDiscovery();
                expect(discovery['detectModernModel']('Adventurer 5M Pro', 0x5A02)).toBe(
                    PrinterModel.Adventurer5MPro
                );
            });

            it('should detect 5M by product type', () => {
                const discovery = createDiscovery();
                expect(discovery['detectModernModel']('Adventurer 5M', 0x5A02)).toBe(
                    PrinterModel.Adventurer5M
                );
            });

            it('should return Unknown for unrecognized models', () => {
                const discovery = createDiscovery();
                expect(discovery['detectModernModel']('Unknown Printer', 0x0000)).toBe(
                    PrinterModel.Unknown
                );
            });
        });

        describe('Legacy Protocol', () => {
            it('should detect Adventurer 4 by name', () => {
                const discovery = createDiscovery();
                expect(discovery['detectLegacyModel']('Adventurer 4')).toBe(PrinterModel.Adventurer4);
                expect(discovery['detectLegacyModel']('Adventurer4')).toBe(PrinterModel.Adventurer4);
                expect(discovery['detectLegacyModel']('AD4')).toBe(PrinterModel.Adventurer4);
            });

            it('should detect Adventurer 3 by name', () => {
                const discovery = createDiscovery();
                expect(discovery['detectLegacyModel']('Adventurer 3')).toBe(PrinterModel.Adventurer3);
                expect(discovery['detectLegacyModel']('Adventurer3')).toBe(PrinterModel.Adventurer3);
                expect(discovery['detectLegacyModel']('AD3')).toBe(PrinterModel.Adventurer3);
            });

            it('should return Unknown for unrecognized models', () => {
                const discovery = createDiscovery();
                expect(discovery['detectLegacyModel']('Unknown Printer')).toBe(PrinterModel.Unknown);
            });
        });
    });

    describe('Response Parsing', () => {
        it('should delegate to modern parser for 276-byte responses', () => {
            const discovery = createDiscovery();
            const buffer = createModernBuffer({ name: 'Test 5M' });

            const result = discovery['parseDiscoveryResponse'](buffer, {
                address: '192.168.1.1',
                port: 8899,
                family: 'IPv4',
                size: 276,
            });

            expect(result?.protocolFormat).toBe(DiscoveryProtocol.Modern);
            expect(result?.name).toBe('Test 5M');
        });

        it('should delegate to legacy parser for 140-byte responses', () => {
            const discovery = createDiscovery();
            const buffer = createLegacyBuffer({ name: 'Test A4' });

            const result = discovery['parseDiscoveryResponse'](buffer, {
                address: '192.168.1.2',
                port: 8899,
                family: 'IPv4',
                size: 140,
            });

            expect(result?.protocolFormat).toBe(DiscoveryProtocol.Legacy);
            expect(result?.name).toBe('Test A4');
        });

        it('should return null for empty buffer', () => {
            const discovery = createDiscovery();
            const buffer = Buffer.alloc(0);

            const result = discovery['parseDiscoveryResponse'](buffer, {
                address: '192.168.1.3',
                port: 8899,
                family: 'IPv4',
                size: 0,
            });

            expect(result).toBeNull();
        });

        it('should return null for oversized buffer that matches neither protocol', () => {
            const discovery = createDiscovery();
            const buffer = Buffer.alloc(50);

            const result = discovery['parseDiscoveryResponse'](buffer, {
                address: '192.168.1.4',
                port: 8899,
                family: 'IPv4',
                size: 50,
            });

            expect(result).toBeNull();
        });
    });

    describe('Integration Tests', () => {
        it('should handle successful discovery with mocked socket', async () => {
            // Create a test discovery class with mocked socket creation
            class TestPrinterDiscovery extends PrinterDiscovery {
                public mockSocket: dgram.Socket | null = null;

                protected async createDiscoverySocket(): Promise<dgram.Socket> {
                    const mockSocket = new EventEmitter() as dgram.Socket;
                    mockSocket.bind = vi.fn((_port, callback) => {
                        if (callback) callback();
                    });
                    mockSocket.setBroadcast = vi.fn();
                    mockSocket.send = vi.fn();
                    mockSocket.close = vi.fn();
                    mockSocket.addMembership = vi.fn();
                    this.mockSocket = mockSocket;
                    return mockSocket;
                }
            }

            const discovery = new TestPrinterDiscovery();

            // Send a modern protocol response after socket creation
            setTimeout(() => {
                const mockSocket = discovery.mockSocket;
                if (mockSocket) {
                    const buffer = createModernBuffer({
                        name: 'AD5X',
                        serialNumber: 'AD5X001',
                    });
                    mockSocket.emit('message', buffer, {
                        address: '192.168.1.100',
                        port: 8899,
                        family: 'IPv4',
                        size: 276,
                    });
                }
            }, 50);

            const printers = await discovery.discover({ timeout: 200, idleTimeout: 100 });

            expect(printers).toHaveLength(1);
            expect(printers[0].name).toBe('AD5X');
            expect(printers[0].serialNumber).toBe('AD5X001');
        });

        it('should deduplicate printers by IP:port', async () => {
            // Create a test discovery class with mocked socket creation
            class TestPrinterDiscovery extends PrinterDiscovery {
                public mockSocket: dgram.Socket | null = null;

                protected async createDiscoverySocket(): Promise<dgram.Socket> {
                    const mockSocket = new EventEmitter() as dgram.Socket;
                    mockSocket.bind = vi.fn((_port, callback) => {
                        if (callback) callback();
                    });
                    mockSocket.setBroadcast = vi.fn();
                    mockSocket.send = vi.fn();
                    mockSocket.close = vi.fn();
                    mockSocket.addMembership = vi.fn();
                    this.mockSocket = mockSocket;
                    return mockSocket;
                }
            }

            const discovery = new TestPrinterDiscovery();

            // Send multiple responses from same printer
            setTimeout(() => {
                const mockSocket = discovery.mockSocket;
                if (mockSocket) {
                    const modernBuffer = createModernBuffer({
                        name: 'Adventurer 5M',
                        serialNumber: 'SN123',
                    });
                    const legacyBuffer = createLegacyBuffer({ name: 'Adventurer 5M' });

                    mockSocket.emit('message', modernBuffer, {
                        address: '192.168.1.50',
                        port: 8899,
                        family: 'IPv4',
                        size: 276,
                    });

                    mockSocket.emit('message', legacyBuffer, {
                        address: '192.168.1.50',
                        port: 8899,
                        family: 'IPv4',
                        size: 140,
                    });
                }
            }, 50);

            const printers = await discovery.discover({ timeout: 200, idleTimeout: 100 });

            expect(printers).toHaveLength(1);
            expect(printers[0].protocolFormat).toBe(DiscoveryProtocol.Modern); // Should prefer modern
        });

        it('should handle timeout with no responses', async () => {
            // Create a test discovery class with mocked socket creation
            class TestPrinterDiscovery extends PrinterDiscovery {
                protected async createDiscoverySocket(): Promise<dgram.Socket> {
                    const mockSocket = new EventEmitter() as dgram.Socket;
                    mockSocket.bind = vi.fn((_port, callback) => {
                        if (callback) callback();
                    });
                    mockSocket.setBroadcast = vi.fn();
                    mockSocket.send = vi.fn();
                    mockSocket.close = vi.fn();
                    mockSocket.addMembership = vi.fn();
                    return mockSocket;
                }
            }

            const discovery = new TestPrinterDiscovery();

            const printers = await discovery.discover({ timeout: 200, idleTimeout: 100 });

            expect(printers).toHaveLength(0);
        });
    });

    describe('Monitor Functionality', () => {
        it('should emit discovered events for printers', async () => {
            // Create a test discovery class with mocked socket creation
            class TestPrinterDiscovery extends PrinterDiscovery {
                public mockSocket: dgram.Socket | null = null;

                protected async createDiscoverySocket(): Promise<dgram.Socket> {
                    const mockSocket = new EventEmitter() as dgram.Socket;
                    mockSocket.bind = vi.fn((_port, callback) => {
                        if (callback) callback();
                    });
                    mockSocket.setBroadcast = vi.fn();
                    mockSocket.send = vi.fn();
                    mockSocket.close = vi.fn();
                    mockSocket.addMembership = vi.fn();
                    this.mockSocket = mockSocket;
                    return mockSocket;
                }
            }

            const discovery = new TestPrinterDiscovery();

            const monitor = discovery.monitor({ timeout: 200, idleTimeout: 100 });

            const discoveredPrinters: DiscoveredPrinter[] = [];
            const endPromise = new Promise<void>((resolve) => {
                monitor.on('discovered', (printer: DiscoveredPrinter) => {
                    discoveredPrinters.push(printer);
                });

                monitor.on('end', () => {
                    expect(discoveredPrinters).toHaveLength(1);
                    expect(discoveredPrinters[0].name).toBe('Test Monitor');
                    resolve();
                });
            });

            // Send a printer response
            setTimeout(() => {
                const mockSocket = discovery.mockSocket;
                if (mockSocket) {
                    const buffer = createModernBuffer({ name: 'Test Monitor' });
                    mockSocket.emit('message', buffer, {
                        address: '192.168.1.150',
                        port: 8899,
                        family: 'IPv4',
                        size: 276,
                    });
                }
            }, 50);

            await endPromise;
        });

        it('should emit end when stopped manually', async () => {
            class TestPrinterDiscovery extends PrinterDiscovery {
                protected async createDiscoverySocket(): Promise<dgram.Socket> {
                    const mockSocket = new EventEmitter() as dgram.Socket;
                    mockSocket.bind = vi.fn((_port, callback) => {
                        if (callback) callback();
                    });
                    mockSocket.setBroadcast = vi.fn();
                    mockSocket.send = vi.fn();
                    mockSocket.close = vi.fn();
                    mockSocket.addMembership = vi.fn();
                    return mockSocket;
                }
            }

            const discovery = new TestPrinterDiscovery();
            const monitor = discovery.monitor({ timeout: 1000, maxRetries: 10 });

            const endPromise = new Promise<void>((resolve, reject) => {
                const timeoutHandle = setTimeout(() => {
                    reject(new Error('Timed out waiting for end event'));
                }, 500);

                monitor.on('error', reject);
                monitor.on('end', () => {
                    clearTimeout(timeoutHandle);
                    resolve();
                });
            });

            setTimeout(() => {
                monitor.stop();
            }, 50);

            await endPromise;
        });

        it('should honor idleTimeout after first discovery response', async () => {
            class TestPrinterDiscovery extends PrinterDiscovery {
                public mockSocket: dgram.Socket | null = null;

                protected async createDiscoverySocket(): Promise<dgram.Socket> {
                    const mockSocket = new EventEmitter() as dgram.Socket;
                    mockSocket.bind = vi.fn((_port, callback) => {
                        if (callback) callback();
                    });
                    mockSocket.setBroadcast = vi.fn();
                    mockSocket.send = vi.fn();
                    mockSocket.close = vi.fn();
                    mockSocket.addMembership = vi.fn();
                    this.mockSocket = mockSocket;
                    return mockSocket;
                }
            }

            const discovery = new TestPrinterDiscovery();
            const start = Date.now();
            const monitor = discovery.monitor({ timeout: 1000, idleTimeout: 100, maxRetries: 10 });

            const endPromise = new Promise<void>((resolve, reject) => {
                const timeoutHandle = setTimeout(() => {
                    reject(new Error('Timed out waiting for idleTimeout end event'));
                }, 1000);

                monitor.on('error', reject);
                monitor.on('end', () => {
                    clearTimeout(timeoutHandle);
                    resolve();
                });
            });

            setTimeout(() => {
                const mockSocket = discovery.mockSocket;
                if (mockSocket) {
                    const buffer = createModernBuffer({ name: 'Idle Timeout Test' });
                    mockSocket.emit('message', buffer, {
                        address: '192.168.1.160',
                        port: 8899,
                        family: 'IPv4',
                        size: 276,
                    });
                }
            }, 50);

            await endPromise;
            const elapsedMs = Date.now() - start;

            expect(elapsedMs).toBeLessThan(500);
        });
    });

    describe('Broadcast Address Calculation', () => {
        it('should calculate broadcast address correctly', () => {
            const discovery = createDiscovery();
            expect(discovery['calculateBroadcastAddress']('192.168.1.10', '255.255.255.0')).toBe(
                '192.168.1.255'
            );
            expect(discovery['calculateBroadcastAddress']('10.0.0.5', '255.0.0.0')).toBe('10.255.255.255');
            expect(discovery['calculateBroadcastAddress']('172.16.5.10', '255.255.0.0')).toBe(
                '172.16.255.255'
            );
        });

        it('should return null for invalid inputs', () => {
            const discovery = createDiscovery();
            expect(discovery['calculateBroadcastAddress']('invalid', '255.255.255.0')).toBeNull();
            expect(discovery['calculateBroadcastAddress']('192.168.1.1', 'invalid')).toBeNull();
        });
    });
});

describe('DiscoveryOptions', () => {
    // Test discovery class with mocked socket
    class TestPrinterDiscovery extends PrinterDiscovery {
        public mockSocket: dgram.Socket | null = null;

        protected async createDiscoverySocket(): Promise<dgram.Socket> {
            const mockSocket = new EventEmitter() as dgram.Socket;
            mockSocket.bind = vi.fn((_port, callback) => {
                if (callback) callback();
            });
            mockSocket.setBroadcast = vi.fn();
            mockSocket.send = vi.fn();
            mockSocket.close = vi.fn();
            mockSocket.addMembership = vi.fn();
            this.mockSocket = mockSocket;
            return mockSocket;
        }
    }

    it('should merge user options with defaults', async () => {
        const discovery = new TestPrinterDiscovery();

        const customOptions: DiscoveryOptions = {
            timeout: 200,
            maxRetries: 2,
            ports: [8899],
        };

        const printers = await discovery.discover(customOptions);

        // Should complete without printers (no responses)
        expect(printers).toHaveLength(0);
    });

    it('should support disabling multicast', async () => {
        const discovery = new TestPrinterDiscovery();

        const options: DiscoveryOptions = {
            timeout: 200,
            idleTimeout: 100,
            useMulticast: false,
            useBroadcast: true,
        };

        const printers = await discovery.discover(options);
        expect(printers).toHaveLength(0);
    });

    it('should support disabling broadcast', async () => {
        const discovery = new TestPrinterDiscovery();

        const options: DiscoveryOptions = {
            timeout: 200,
            idleTimeout: 100,
            useMulticast: true,
            useBroadcast: false,
        };

        const printers = await discovery.discover(options);
        expect(printers).toHaveLength(0);
    });

    it('should not send packets when multicast and broadcast are both disabled', async () => {
        const discovery = new TestPrinterDiscovery();

        const options: DiscoveryOptions = {
            timeout: 50,
            idleTimeout: 25,
            maxRetries: 1,
            useMulticast: false,
            useBroadcast: false,
            ports: [8899, 19000, 48899],
        };

        const printers = await discovery.discover(options);
        expect(printers).toHaveLength(0);
        expect(discovery.mockSocket).not.toBeNull();
        expect((discovery.mockSocket?.send as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    });
});
