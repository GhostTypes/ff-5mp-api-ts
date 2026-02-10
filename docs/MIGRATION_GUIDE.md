# Printer Discovery API Migration Guide

**Version:** 2.0.0
**Date:** 2025-02-08
**Breaking Changes:** Yes

## Overview

The printer discovery API has been completely rewritten to support all FlashForge printer models (AD5X, 5M, 5M Pro, Adventurer 4, Adventurer 3) with multi-protocol UDP discovery. The legacy API has been removed.

## What Changed

| Old API | New API |
|---------|---------|
| `FlashForgePrinterDiscovery` | `PrinterDiscovery` |
| `FlashForgePrinter` | `DiscoveredPrinter` (interface) |
| `discoverPrintersAsync(timeout, idleTimeout, maxRetries)` | `discover({ timeout, idleTimeout, maxRetries })` |
| `isAD5X?: boolean` | `model: PrinterModel` |
| Limited metadata (name, serial, IP) | Complete metadata (model, ports, status, etc.) |

## Migration Examples

### Basic Discovery

**Before (v1.x):**
```typescript
import { FlashForgePrinterDiscovery, FlashForgePrinter } from '@ghosttypes/ff-api';

const discovery = new FlashForgePrinterDiscovery();
const printers: FlashForgePrinter[] = await discovery.discoverPrintersAsync(10000, 1500, 3);

printers.forEach(printer => {
    console.log(`${printer.name} - ${printer.ipAddress}`);
    if (printer.isAD5X) {
        console.log('  AD5X detected');
    }
});
```

**After (v2.x):**
```typescript
import { PrinterDiscovery, PrinterModel, type DiscoveredPrinter } from '@ghosttypes/ff-api';

const discovery = new PrinterDiscovery();
const printers: DiscoveredPrinter[] = await discovery.discover({
    timeout: 10000,
    idleTimeout: 1500,
    maxRetries: 3
});

printers.forEach(printer => {
    console.log(`${printer.model}: ${printer.name} - ${printer.ipAddress}`);
    if (printer.model === PrinterModel.AD5X) {
        console.log('  AD5X detected');
    }
});
```

### Model Detection

**Before:**
```typescript
if (printer.isAD5X) {
    // Handle AD5X
} else {
    // Handle other models
}
```

**After:**
```typescript
switch (printer.model) {
    case PrinterModel.AD5X:
        // Handle AD5X
        break;
    case PrinterModel.Adventurer5MPro:
        // Handle 5M Pro
        break;
    case PrinterModel.Adventurer5M:
        // Handle 5M
        break;
    case PrinterModel.Adventurer4:
        // Handle Adventurer 4
        break;
    case PrinterModel.Adventurer3:
        // Handle Adventurer 3
        break;
    default:
        // Unknown model
        break;
}
```

### Accessing Additional Properties

**Before:**
```typescript
const printer: FlashForgePrinter = {
    name: 'AD5X',
    serialNumber: 'SN123',
    ipAddress: '192.168.1.100',
    isAD5X: true
};
```

**After:**
```typescript
const printer: DiscoveredPrinter = {
    model: PrinterModel.AD5X,
    protocolFormat: DiscoveryProtocol.Modern,
    name: 'AD5X',
    ipAddress: '192.168.1.100',
    commandPort: 8899,
    serialNumber: 'SN123',
    eventPort: 8898,
    vendorId: 0x2B71,
    productId: 0x0024,
    productType: 0x5A02,
    statusCode: 0,
    status: PrinterStatus.Ready
};
```

### Custom Discovery Options

**Before:**
```typescript
await discovery.discoverPrintersAsync(5000, 1000, 1);
```

**After:**
```typescript
await discovery.discover({
    timeout: 5000,
    idleTimeout: 1000,
    maxRetries: 1,
    useMulticast: true,
    useBroadcast: true,
    ports: [19000, 8899]
});
```

## New Features

### Event-Based Monitoring

The new API supports continuous monitoring with events:

```typescript
const discovery = new PrinterDiscovery();
const monitor = discovery.monitor({ timeout: 30000 });

monitor.on('discovered', (printer: DiscoveredPrinter) => {
    console.log(`✓ Found: ${printer.model} - ${printer.name}`);
});

monitor.on('end', () => {
    console.log('Discovery complete');
});

monitor.on('error', (error: Error) => {
    console.error('Discovery error:', error);
});
```

### Printer Status

The new API includes printer status from discovery:

```typescript
const printers = await discovery.discover();
if (printers.length > 0) {
    const printer = printers[0];

    if (printer.status === PrinterStatus.Ready) {
        console.log('Printer is ready to print');
    } else if (printer.status === PrinterStatus.Busy) {
        console.log('Printer is busy');
    } else if (printer.status === PrinterStatus.Error) {
        console.log('Printer has an error');
    }
}
```

### Multi-Protocol Support

The new API automatically handles multiple protocols:

- **Modern Protocol (276-byte)**: AD5X, 5M, 5M Pro
- **Legacy Protocol (140-byte)**: Adventurer 3, Adventurer 4

```typescript
printers.forEach(printer => {
    if (printer.protocolFormat === DiscoveryProtocol.Modern) {
        console.log('Modern printer - full metadata available');
        console.log(`  Serial: ${printer.serialNumber}`);
        console.log(`  HTTP API: ${printer.ipAddress}:${printer.eventPort}`);
    } else if (printer.protocolFormat === DiscoveryProtocol.Legacy) {
        console.log('Legacy printer - basic metadata');
    }
});
```

## Type Reference

### PrinterModel Enum

```typescript
enum PrinterModel {
    AD5X = 'AD5X',
    Adventurer5M = 'Adventurer5M',
    Adventurer5MPro = 'Adventurer5MPro',
    Adventurer4 = 'Adventurer4',
    Adventurer3 = 'Adventurer3',
    Unknown = 'Unknown'
}
```

### DiscoveryProtocol Enum

```typescript
enum DiscoveryProtocol {
    Modern = 'modern',   // 276-byte responses
    Legacy = 'legacy'    // 140-byte responses
}
```

### PrinterStatus Enum

```typescript
enum PrinterStatus {
    Ready = 0,
    Busy = 1,
    Error = 2,
    Unknown = 3
}
```

### DiscoveredPrinter Interface

```typescript
interface DiscoveredPrinter {
    model: PrinterModel;
    protocolFormat: DiscoveryProtocol;
    name: string;
    ipAddress: string;
    commandPort: number;
    serialNumber?: string;        // Modern protocol only
    eventPort?: number;           // Modern protocol only (typically 8898)
    vendorId?: number;
    productId?: number;
    productType?: number;         // Modern protocol only
    statusCode?: number;
    status?: PrinterStatus;
}
```

### DiscoveryOptions Interface

```typescript
interface DiscoveryOptions {
    timeout?: number;             // Default: 10000
    idleTimeout?: number;         // Default: 1500
    maxRetries?: number;          // Default: 3
    useMulticast?: boolean;       // Default: true
    useBroadcast?: boolean;       // Default: true
    ports?: number[];             // Default: [8899, 19000, 48899]
}
```

## Full Migration Checklist

- [ ] Update imports from `FlashForgePrinterDiscovery` to `PrinterDiscovery`
- [ ] Change `discoverPrintersAsync()` calls to `discover()`
- [ ] Update parameter style from positional to options object
- [ ] Replace `FlashForgePrinter` type with `DiscoveredPrinter`
- [ ] Replace `isAD5X` boolean checks with `model` enum comparisons
- [ ] Update any destructuring to use new property names
- [ ] Remove `toString()` calls (not available on interface)
- [ ] Test with all printer models you support
- [ ] Update any documentation or examples

## Need Help?

- **New API Documentation**: See `docs/README.md` and `docs/clients.md`
- **Full Specification**: See `docs/specs/printer-discovery.md`
- **Type Definitions**: See `src/models/PrinterDiscovery.ts`
- **Example Usage**: See test files in `src/api/PrinterDiscovery.test.ts`
