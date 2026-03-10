# Client Documentation

This page documents the current TypeScript client surface. If you are comparing this repository with the Python library, read [parity.md](parity.md) first.

## FiveMClient

`FiveMClient` is the primary modern client for Adventurer 5M, Adventurer 5M Pro, and AD5X printers.

### Constructor

```typescript
constructor(
  ipAddress: string,
  serialNumber: string,
  checkCode: string,
  options?: FiveMClientConnectionOptions
)
```

### Connection Options

```typescript
interface FiveMClientConnectionOptions {
  httpPort?: number;
  tcpPort?: number;
}
```

### Important Properties

- `control`
- `jobControl`
- `info`
- `files`
- `tempControl`
- `tcpClient`
- `printerName`
- `isPro`
- `isAD5X`
- `firmwareVersion`
- `cameraStreamUrl`
- `ledControl`
- `filtrationControl`

### Key Methods

- `initialize()`
- `initControl()`
- `verifyConnection()`
- `sendProductCommand()`
- `cacheDetails(info)`
- `dispose()`

### Notes

- This client does not try to mirror every Python convenience helper.
- TypeScript callers should use the module objects directly, for example `client.jobControl.pausePrintJob()` rather than expecting higher-level wrapper aliases.

## FlashForgeClient

`FlashForgeClient` is the lower-level TCP-oriented client used for legacy printers and direct G-code operations.

### Constructor

```typescript
constructor(hostname: string, options?: FlashForgeTcpClientOptions)
```

### Typical Use Cases

- Adventurer 3 / 4 and other legacy TCP workflows
- direct TCP control
- low-level operations wrapped by `FiveMClient`

### Example

```typescript
import { FlashForgeClient } from '@ghosttypes/ff-api';

const client = new FlashForgeClient('192.168.1.100');
await client.initControl();
const info = await client.getPrinterInfo();
```

## PrinterDiscovery

`PrinterDiscovery` is the typed discovery API for all supported FlashForge models.

### Constructor

```typescript
constructor()
```

### Methods

- `discover(options?: DiscoveryOptions)`
- `monitor(options?: DiscoveryOptions)`

### Example

```typescript
import { PrinterDiscovery } from '@ghosttypes/ff-api';

const discovery = new PrinterDiscovery();
const printers = await discovery.discover({ timeout: 5000 });
```
