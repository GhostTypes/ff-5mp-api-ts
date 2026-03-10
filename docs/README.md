# FlashForge TypeScript API Documentation

This documentation covers the TypeScript surface for `@ghosttypes/ff-api`.

## Before You Start

This repository and `flashforge-python-api` share the same protocol/domain baseline, but they do not promise strict 1:1 public API parity. The TypeScript library uses its own idiomatic public surface.

Read [parity.md](parity.md) first if you are comparing both libraries or maintaining downstream integrations across both languages.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Client Documentation](clients.md)
4. [Models & Interfaces](models.md)
5. [Modules & Namespaces](modules.md)
6. [Protocols](protocols.md)
7. [Error Handling](errors.md)
8. [Advanced Topics](advanced.md)
9. [Discovery Migration](MIGRATION_GUIDE.md)

## Getting Started

### Installation

```bash
npm install @ghosttypes/ff-api
```

### Discovery

```typescript
import { PrinterDiscovery } from '@ghosttypes/ff-api';

const discovery = new PrinterDiscovery();
const printers = await discovery.discover();
```

### Connecting to a Modern Printer

```typescript
import { FiveMClient } from '@ghosttypes/ff-api';

const client = new FiveMClient('192.168.1.100', 'SERIAL123', 'CHECKCODE123');

if (await client.initialize()) {
  await client.initControl();
}
```

### Connecting to a Legacy TCP Printer

```typescript
import { FlashForgeClient } from '@ghosttypes/ff-api';

const client = new FlashForgeClient('192.168.1.100');
await client.initControl();
```

## Architecture Overview

The library is built around three main ideas:

- `FiveMClient` for modern HTTP-capable printers such as Adventurer 5M, 5M Pro, and AD5X
- `FlashForgeClient` / `FlashForgeTcpClient` for legacy TCP and low-level G-code operations
- `PrinterDiscovery` for typed UDP discovery across modern and legacy models

For method-level documentation, continue to [clients.md](clients.md) and [modules.md](modules.md).
