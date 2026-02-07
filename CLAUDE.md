# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A TypeScript API library (`@ghosttypes/ff-api`) for controlling FlashForge 3D printers, reverse-engineered from FlashForge software communication. Supports Adventurer 5M/5M Pro, AD5X, and legacy Adventurer 3/4 printers. Published to GitHub Packages (npm).

## Build & Test Commands

- **Build:** `pnpm build` (runs `tsc`, outputs to `dist/`)
- **Test all:** `pnpm test` (Jest with ts-jest)
- **Test single file:** `pnpm exec jest path/to/file.test.ts`
- **Test watch:** `pnpm test:watch`
- **Test coverage:** `pnpm test:coverage`

## Architecture

### Dual Communication Protocol

The API uses two communication layers that work together:

1. **HTTP API** (port 8898) — Modern REST-like API for 5M/5M Pro/AD5X printers. Uses `axios` with JSON payloads authenticated via `serialNumber` + `checkCode`. Endpoints defined in `src/api/server/Endpoints.ts`, command types in `src/api/server/Commands.ts`.

2. **TCP API** (port 8899) — Legacy G-code/M-code protocol over raw TCP sockets. Used for all printer models and also embedded within `FiveMClient` for operations not available over HTTP (direct G-code, homing, temperature control). Commands defined in `src/tcpapi/client/GCodes.ts`.

### Client Hierarchy

- **`FiveMClient`** (`src/FiveMClient.ts`) — Main client for 5M/5M Pro/AD5X. Composes HTTP-based control modules and embeds a `FlashForgeClient` for TCP operations. Requires IP, serial number, and check code.
  - `control` (Control) — LED, filtration, camera, fan speed, filament operations
  - `jobControl` (JobControl) — Start/stop/pause/resume print jobs
  - `info` (Info) — Printer details, machine state
  - `files` (Files) — File listing, upload, thumbnails
  - `tempControl` (TempControl) — Temperature control via HTTP
  - `tcpClient` (FlashForgeClient) — Direct G-code access

- **`FlashForgeClient`** (`src/tcpapi/FlashForgeClient.ts`) — High-level TCP client for legacy printers. Extends `FlashForgeTcpClient` with parsed G-code commands. Only requires IP address.

- **`FlashForgeTcpClient`** (`src/tcpapi/FlashForgeTcpClient.ts`) — Low-level TCP socket management with keep-alive, command serialization, and multi-line response parsing.

### Data Flow

Raw API responses (`FFPrinterDetail` in `src/models/ff-models.ts`) are transformed into the structured `FFMachineInfo` model by `MachineInfo.fromDetail()` (`src/models/MachineInfo.ts`). This handles status string-to-enum mapping, time formatting, temperature pairing, and boolean conversion from the printer's "open"/"close" string convention.

### Network Layer

- `NetworkUtils` (`src/api/network/NetworkUtils.ts`) — Response validation helpers; checks `GenericResponse.code` for success.
- `FNetCode` (`src/api/network/FNetCode.ts`) — Network code constants.
- `FlashForgePrinterDiscovery` (`src/api/PrinterDiscovery.ts`) — UDP broadcast discovery on port 48899, parses binary response buffers at fixed offsets for printer name and serial number.

### TCP Response Parsers

Located in `src/tcpapi/replays/`, each parser has a `fromReplay(response)` method that extracts structured data from raw TCP text responses: `PrinterInfo`, `TempInfo`, `EndstopStatus`, `PrintStatus`, `LocationInfo`, `ThumbnailInfo`.

### AD5X Support

The AD5X (Adventurer 5X) extends the 5M API with Intelligent Filament Station (IFS) support. Key types: `AD5XMaterialMapping`, `AD5XLocalJobParams`, `AD5XSingleColorJobParams`, `AD5XUploadParams`, `MatlStationInfo`, `SlotInfo` — all in `src/models/ff-models.ts`.

## Key Conventions

- All public exports go through `src/index.ts`
- HTTP API uses "open"/"close" strings for boolean states in payloads
- TCP commands are prefixed with `~` (e.g., `~M115`, `~M119`)
- Test files are co-located with source files using `.test.ts` suffix
- TypeScript strict mode enabled, target ES2018, CommonJS modules
