# Client Documentation

This section documents the primary client classes used to interact with FlashForge printers.

## FiveMClient

The `FiveMClient` is the modern interface for Adventurer 5M, 5M Pro, and Adventurer 5X (AD5X) printers. It combines HTTP API calls with a TCP connection for comprehensive control.

### Constructor

```typescript
constructor(ipAddress: string, serialNumber: string, checkCode: string)
```

- **`ipAddress`** (`string`): The local IP address of the printer.
- **`serialNumber`** (`string`): The printer's serial number (required for authentication).
- **`checkCode`** (`string`): The check code for authentication.

### Properties

- **`control`** (`Control`): Interface for general printer controls (home, fans, LEDs, etc.).
- **`jobControl`** (`JobControl`): Interface for managing print jobs (start, stop, pause, file upload).
- **`info`** (`Info`): Interface for retrieving machine status and details.
- **`files`** (`Files`): Interface for file management (list files, get thumbnails).
- **`tempControl`** (`TempControl`): Interface for temperature management.
- **`tcpClient`** (`FlashForgeClient`): The underlying TCP client instance.
- **`printerName`** (`string`): The configured name of the printer.
- **`isPro`** (`boolean`): True if the printer is a Pro model.
- **`isAD5X`** (`boolean`): True if the printer is an AD5X model.
- **`firmwareVersion`** (`string`): The full firmware version string.
- **`ledControl`** (`boolean`): True if LED control is available/enabled.
- **`filtrationControl`** (`boolean`): True if filtration control is available/enabled.

### Key Methods

#### `initialize()`

```typescript
public async initialize(): Promise<boolean>
```

Initializes the client by verifying the connection to the printer. Returns `true` if successful.

#### `initControl()`

```typescript
public async initControl(): Promise<boolean>
```

Fully initializes control capabilities by authenticating via the product command and establishing the TCP connection. Must be called before performing control actions.

#### `verifyConnection()`

```typescript
public async verifyConnection(): Promise<boolean>
```

Checks connectivity by attempting to fetch printer details. Updates cached machine info.

#### `dispose()`

```typescript
public async dispose(): Promise<void>
```

Cleanly closes connections and stops background keep-alive processes.

---

## FlashForgeClient

The `FlashForgeClient` is a TCP-based client for legacy printers or low-level G-code operations. It extends `FlashForgeTcpClient`.

### Constructor

```typescript
constructor(hostname: string)
```

- **`hostname`** (`string`): The IP address or hostname of the printer.

### Key Methods

#### `initControl()`

```typescript
public async initControl(): Promise<boolean>
```

Establishes the TCP connection, logs in, and starts the keep-alive loop.

#### `getPrinterInfo()`

```typescript
public async getPrinterInfo(): Promise<PrinterInfo | null>
```

Retrieves basic printer information (firmware, machine type, etc.).

#### `getTempInfo()`

```typescript
public async getTempInfo(): Promise<TempInfo | null>
```

Gets current extruder and bed temperatures.

#### `move(x, y, z, feedrate)`

```typescript
public async move(x: number, y: number, z: number, feedrate: number): Promise<boolean>
```

Moves the print head to the specified absolute coordinates.

#### `setExtruderTemp(temp, waitFor)`

```typescript
public async setExtruderTemp(temp: number, waitFor: boolean = false): Promise<boolean>
```

Sets the extruder target temperature.

---

## PrinterDiscovery

A utility class for finding FlashForge printers on the local network via UDP multicast/broadcast. Supports all FlashForge models including AD5X, 5M, 5M Pro, Adventurer 4, and Adventurer 3.

### Constructor

```typescript
constructor()
```

### Methods

#### `discover()`

```typescript
public async discover(options?: DiscoveryOptions): Promise<DiscoveredPrinter[]>
```

Discovers printers on the local network using UDP multicast and broadcast.

**Options:**
- **`timeout`** (number): Total time to wait for responses (default: 10000ms)
- **`idleTimeout`** (number): Time to wait after last response (default: 1500ms)
- **`maxRetries`** (number): Maximum retry attempts (default: 3)
- **`useMulticast`** (boolean): Use multicast discovery (default: true)
- **`useBroadcast`** (boolean): Use broadcast discovery (default: true)
- **`ports`** (number[]): Specific ports to scan (default: [8899, 19000, 48899])

**Returns:** An array of `DiscoveredPrinter` objects with comprehensive printer information.

#### `monitor()`

```typescript
public monitor(options?: DiscoveryOptions): EventEmitter
```

Starts continuous monitoring for printers, emitting events as printers are discovered.

**Returns:** EventEmitter that emits:
- **`discovered`**: Emitted for each new printer found
- **`end`**: Emitted when monitoring completes
- **`error`**: Emitted on errors

### Example

```typescript
import { PrinterDiscovery } from '@ghosttypes/ff-api';

const discovery = new PrinterDiscovery();
const printers = await discovery.discover({ timeout: 5000 });

printers.forEach(printer => {
    console.log(`${printer.model}: ${printer.name}`);
    console.log(`  IP: ${printer.ipAddress}:${printer.commandPort}`);
    console.log(`  Serial: ${printer.serialNumber || 'N/A'}`);
    console.log(`  Status: ${printer.status}`);
});
```
