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

## FlashForgePrinterDiscovery

A utility class for finding printers on the local network.

### Methods

#### `discoverPrintersAsync()`

```typescript
public async discoverPrintersAsync(timeoutMs: number = 10000, idleTimeoutMs: number = 1500, maxRetries: number = 3): Promise<FlashForgePrinter[]>
```

Broadcasts a discovery packet via UDP and listens for responses.

- **`timeoutMs`**: Max time to wait for responses.
- **`idleTimeoutMs`**: Time to wait after the last response before returning.
- **`maxRetries`**: Number of broadcast attempts if no printers are found initially.

**Returns:** An array of `FlashForgePrinter` objects containing IP, Serial, and Name.
