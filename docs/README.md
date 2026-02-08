# FlashForge API Documentation

Welcome to the comprehensive documentation for the FlashForge API. This library provides a robust interface for interacting with FlashForge 3D printers, supporting both legacy TCP-based communication and the newer HTTP API used by 5M, 5M Pro, and Adventurer 5X (AD5X) series printers.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Client Documentation](clients.md)
4. [Models & Interfaces](models.md)
5. [Modules & Namespaces](modules.md)
6. [Protocols](protocols.md)
7. [Error Handling](errors.md)
8. [Advanced Topics](advanced.md)

## Getting Started

### Installation

```bash
# npm
npm install @ghosttypes/ff-api

# pnpm
pnpm add @ghosttypes/ff-api
```

### Discovery

To start interacting with a printer, you first need to discover it on your local network.

```typescript
import { PrinterDiscovery } from '@ghosttypes/ff-api';

const discovery = new PrinterDiscovery();
const printers = await discovery.discover();

printers.forEach(printer => {
    console.log(`Found ${printer.model}: ${printer.name} at ${printer.ipAddress}`);
    if (printer.serialNumber) {
        console.log(`  Serial: ${printer.serialNumber}`);
    }
});
```

### connecting to a Printer

Once you have the printer's IP address, serial number, and check code (usually provided by the discovery or known beforehand), you can instantiate a client.

**For newer printers (5M, 5M Pro, AD5X):**

```typescript
import { FiveMClient } from '@ghosttypes/ff-api';

const client = new FiveMClient("192.168.1.100", "SERIAL123", "CHECKCODE123");
const connected = await client.initialize();

if (connected) {
    console.log("Connected!");
    await client.initControl(); // Initialize control connection
}
```

**For legacy printers (Adventurer 3/4, etc.):**

```typescript
import { FlashForgeClient } from '@ghosttypes/ff-api';

const client = new FlashForgeClient("192.168.1.100");
const connected = await client.initControl();

if (connected) {
    console.log("Connected to legacy printer!");
}
```

## Architecture Overview

The library is built around two main client classes:

- **`FiveMClient`**: Designed for the Adventurer 5M series and AD5X. It primarily uses an HTTP API for state management, file operations, and job control, while falling back to TCP for specific real-time commands.
- **`FlashForgeClient`**: A TCP-based client that communicates using FlashForge's G-code/M-code protocol. This is used for legacy printers and is also wrapped by `FiveMClient` for low-level operations.

For detailed API usage, refer to the [Client Documentation](clients.md).
