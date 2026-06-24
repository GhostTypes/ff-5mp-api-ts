# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A TypeScript API library (`@ghosttypes/ff-api`) for controlling FlashForge 3D printers, reverse-engineered from FlashForge software communication. Supports Adventurer 5M/5M Pro, AD5X, and legacy Adventurer 3/4 printers. Published to GitHub Packages (npm).

## Build & Test Commands

- **Build:** `pnpm build` (runs `tsc`, outputs to `dist/`)
- **Test all:** `pnpm test` (Vitest)
- **Test single file:** `pnpm exec vitest run path/to/file.test.ts`
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

### Model Detection (Pid-First)

`MachineInfo.fromDetail()` derives `IsPro` / `IsAD5X` from the firmware-set integer `pid` field on `/detail` (35 = Adventurer 5M, 36 = 5M Pro, 38 = AD5X — see `KNOWN_HTTP_PIDS` in `MachineInfo.ts`). The raw value is also surfaced as `FFMachineInfo.Pid` for consumers that need to do their own model-class gating. When `pid` is absent (older firmware) the parser falls back to a name+capability heuristic, but new code should NOT substring-match `detail.name` — that field is user-mutable via the LCD or cloud account and changing it broke detection in pre-1.3.1 builds (see CHANGELOG entry for 1.3.1, ref `ff-5mp-hass#13`).

### Why TCP Bootstrap Is Still Required for Modern Printers

The HTTP `/detail` endpoint requires authentication (`serialNumber` + `checkCode` via `FNetCode`). During discovery and the first connection attempt — before a check code has been entered — there are no credentials, so `pid` cannot be read from `/detail`. The library bridges this with TCP:

1. `PrinterDiscovery` (UDP) returns the USB-style PID in the broadcast packet and maps it to a `PrinterModel`. Consumers can pre-select a model class before pairing.
2. After a check code is provided, `FiveMClient.initialize()` runs an authenticated `/detail` call alongside an unauthenticated TCP `M115` via `tcpClient.getPrinterInfo()`. M115 returns `TypeName` (firmware-controlled, e.g. `"FlashForge Adventurer 5M Pro"`) which is safe to substring-match; do NOT use M115's `Name` field for capability inference — like `detail.name` it is user-set.
3. Once `verifyConnection()` finishes, `FFMachineInfo.Pid` / `IsPro` / `IsAD5X` are authoritative. All later capability gating should read those, not re-parse strings.

### Network Layer

- `NetworkUtils` (`src/api/network/NetworkUtils.ts`) — Response validation helpers; checks `GenericResponse.code` for success.
- `FNetCode` (`src/api/network/FNetCode.ts`) — Network code constants.
- `PrinterDiscovery` (`src/api/PrinterDiscovery.ts`) — Universal UDP multicast/broadcast discovery supporting all FlashForge models (AD5X, 5M, 5M Pro, Adventurer 4, Adventurer 3) with multi-protocol response parsing (276-byte modern, 140-byte legacy).

### TCP Response Parsers

Located in `src/tcpapi/replays/`, each parser has a `fromReplay(response)` method that extracts structured data from raw TCP text responses: `PrinterInfo`, `TempInfo`, `EndstopStatus`, `PrintStatus`, `LocationInfo`, `ThumbnailInfo`.

### AD5X Support

The AD5X (Adventurer 5X) extends the 5M API with Intelligent Filament Station (IFS) support. Key types: `AD5XMaterialMapping`, `AD5XLocalJobParams`, `AD5XSingleColorJobParams`, `AD5XUploadParams`, `MatlStationInfo`, `SlotInfo` — all in `src/models/ff-models.ts`.

### Creator 5 / Creator 5 Pro Support

The Creator 5 series is "AD5X + per-tool temps". It shares the 4-slot material station and reuses the AD5X upload path, but **material matching happens at print-start** (`POST /printGcode`) rather than at upload time. Use `startCreator5Job(Creator5JobParams)` — its `materialMappings` are the 3-field `Creator5MaterialMapping` (`toolId` 0-based, `slotId` 1-based, `materialName`; no colors). Per-tool temps are in `FFMachineInfo.ToolTemps[]` (single-nozzle models report a 1-element array). Capability flags: `IsCreator5Pro`, `HasCamera`, `HasLidar`, `HasDoorSensor` (Pro only — plain C5 `doorStatus` is cosmetic). Filtration is force-enabled by model for the C5 Pro in `FiveMClient.sendProductCommand` because its `/product` under-reports the fan states.

## Architecture Note — Organization Axis (future cleanup, NOT urgent)

This library is intentionally organized **by concern** (`Control` / `JobControl` / `Info` / `Files` / `TempControl` / discovery / TCP), exposing a **single `FiveMClient` facade** — not by printer model the way FFUI splits into per-model backends (`AD5XBackend`, `Creator5Backend`, …). That asymmetry is **correct on purpose**: a transport library wins with one capability-based entry point; per-printer *client subclasses* would force a breaking API change and a migration across every consumer (FFUI, FFWebUI) to make the library *worse* to use. **Do not refactor this into per-printer clients.**

The one real smell is that model-specific job logic is accumulating inline in `JobControl.ts` (AD5X + Creator 5). If/when it gets unwieldy, the **non-breaking** fix is to extract per-model job modules *behind the same facade* (e.g. `api/controls/jobs/ad5x.ts`, `api/controls/jobs/creator5.ts`, composed by `JobControl`) — same for `MachineInfo.fromDetail` if model branching grows there. This is optional polish with zero consumer breakage; defer it until it actually hurts, and never bundle it with feature work.

## Key Conventions

- All public exports go through `src/index.ts`
- HTTP API uses "open"/"close" strings for boolean states in payloads
- TCP commands are prefixed with `~` (e.g., `~M115`, `~M119`)
- Test files are co-located with source files using `.test.ts` suffix
- TypeScript strict mode enabled, target ES2018, CommonJS modules
