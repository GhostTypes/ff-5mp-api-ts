# FlashForge TypeScript API

TypeScript and Node.js library for controlling FlashForge 3D printers over the modern HTTP API and the legacy TCP protocol.

## Supported Printers

| Printer | Support |
| --- | --- |
| Adventurer 5M | Full |
| Adventurer 5M Pro | Full |
| AD5X | Full |
| Adventurer 3 / 4 | TCP support |

## Installation

```bash
npm install @ghosttypes/ff-api
```

## Quick Start

### Modern Printers

Use `FiveMClient` for Adventurer 5M, 5M Pro, and AD5X.

```typescript
import { FiveMClient } from '@ghosttypes/ff-api';

async function main() {
  const client = new FiveMClient('192.168.1.100', 'SERIAL_NUMBER', 'CHECK_CODE');

  if (!(await client.initialize())) {
    return;
  }

  await client.initControl();

  console.log(`Printer: ${client.printerName}`);
  console.log(`Firmware: ${client.firmwareVersion}`);

  const status = await client.info.get();
  console.log(`State: ${status?.Status}`);

  await client.control.homeAxes();
  await client.dispose();
}

main();
```

### Legacy TCP Printers

Use `FlashForgeClient` for direct TCP control on older printers.

```typescript
import { FlashForgeClient } from '@ghosttypes/ff-api';

async function main() {
  const client = new FlashForgeClient('192.168.1.101');

  if (await client.initControl()) {
    const info = await client.getPrinterInfo();
    console.log(info?.TypeName);
  }

  await client.dispose();
}

main();
```

## Main Entry Points

- `FiveMClient`: modern HTTP + TCP client for 5M, 5M Pro, and AD5X
- `PrinterDiscovery`: UDP discovery for supported FlashForge printers
- `FlashForgeClient`: lower-level TCP client for legacy printers and direct G-code workflows

## Capabilities

- printer discovery
- printer status and machine information
- job control
- file listing, uploads, and thumbnails
- temperature and motion control
- LED, camera, and filtration control where supported
- AD5X-specific job and material-station support

## Documentation

- [docs/README.md](docs/README.md)
- [docs/clients.md](docs/clients.md)
- [docs/modules.md](docs/modules.md)
- [docs/protocols.md](docs/protocols.md)
