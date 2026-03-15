# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `FlashForgeA4Client` — dedicated Adventurer 4 Lite / Pro TCP client aligned with the documented M601 and M115 behavior
- `A4BuildVolume`, `A4FileEntry`, `A4PrinterInfo`, and `A4PrinterVariant` types for typed Adventurer 4 responses

### Changed

- `PrinterDiscovery` now recognizes Adventurer 4 Lite discovery packets by PID `0x0016` in addition to the existing Pro PID `0x001e`
- README examples now point legacy Adventurer 3 / 4 users at the dedicated TCP clients instead of the generic legacy fallback

## [1.2.0] - 2026-03-08

### Added

- `FiveMClient.cameraStreamUrl` — caches the OEM camera stream URL reported by the printer in machine-info responses, cleared on dispose

### Changed

- `FiveMClient.updateMachineInfo()` now populates `cameraStreamUrl` from `info.CameraStreamUrl`

## [1.1.0] - 2026-03-08

### Added

- `FlashForgeA3Client` — full Adventurer 3 TCP client aligned with the documented G-code protocol, exported from the package root
- `A3GCodeController` — A3-specific G-code command controller with a dedicated instruction set
- `A3BuildVolume`, `A3FileEntry`, `A3PrinterInfo`, `A3Thumbnail` types for typed Adventurer 3 responses
- `GCodeClientCapabilities` interface for capability-based client selection across printer generations
- `PrinterModel`, `DiscoveryProtocol`, `PrinterStatus` enums providing fully-typed discovery results
- `DiscoveredPrinter` and `DiscoveryOptions` TypeScript interfaces replacing loosely-typed discovery objects
- `DiscoveryErrors` — custom error class hierarchy for structured discovery error handling
- PID-based legacy model fallback in `PrinterDiscovery`: known USB product IDs (`0x0008` Adventurer 3, `0x001e` Adventurer 4 Pro) are used as a secondary hint when name heuristics are inconclusive
- `FlashForgeTcpClient.uploadFile()` — M28 / raw-binary / M29 file upload flow for legacy printers, with automatic filename normalization
- `FiveMClientConnectionOptions` — optional HTTP port and TCP port overrides for `FiveMClient` construction
- `FlashForgeTcpClientOptions` — optional TCP port override for `FlashForgeTcpClient` construction
- Vitest test suite with unit coverage for discovery, client lifecycle, and response parsers
- Biome linter and formatter configuration

### Changed

- `FlashForgePrinterDiscovery` renamed to `PrinterDiscovery`; a migration guide is available in `docs/MIGRATION_GUIDE.md`
- Discovery multicast now joins each multicast group once per socket instead of once per port, eliminating duplicate `addMembership` calls
- Legacy model detection upgraded: USB product ID hints are checked as a fallback after name-based matching
- AD5X detection now uses the `hasMatlStation` capability flag and material-station slot data instead of relying solely on the model name string
- M661 (list local files) command settle window increased from 500 ms to 1200 ms to correctly handle two-stage firmware responses
- Package manager migrated from npm to pnpm
- All `any` types eliminated; codebase is fully strict-TypeScript compliant

### Fixed

- Windows multicast `EINVAL` error (`addMembership EINVAL`) caused by calling `addMembership` on the same group multiple times on the same socket
- Missing `client` property on `TempControl` class that caused runtime failures when calling temperature methods
- Discovery monitor incorrectly re-entering active state after idle timeout; transport option semantics clarified
- m661 file list response parsing race: wider settlement window prevents intermittent empty-list returns on real hardware and emulators

## [1.0.0] - 2025-11-15

### Added

- `FiveMClient` — modern HTTP/JSON API client for Adventurer 5M and Adventurer 5M Pro
- `FlashForgeClient` / `FlashForgeTcpClient` — legacy TCP G-code client base
- `FlashForgePrinterDiscovery` — UDP multicast and broadcast discovery covering all FlashForge models
- `Control`, `Files`, `Info`, `JobControl`, `TempControl` — modern API action classes for printer control
- `Filament` — filament data accessor for modern printers
- `GCodeController` — G-code command controller for legacy TCP printers
- `GCodes`, `Commands`, `Endpoints` — G-code and HTTP API constant tables
- `EndstopStatus`, `LocationInfo`, `PrintStatus`, `TempInfo`, `ThumbnailInfo` — TCP response parsers and models
- `MachineInfo` — unified machine state model with AD5X material station support
- `FNetCode`, `NetworkUtils` — network response code constants and HTTP utility helpers
- `FFMachineInfo`, `FFPrinterDetail`, `MatlStationInfo`, `SlotInfo` — typed models for printer detail responses
- AD5X material station support: `AD5XLocalJobParams`, `AD5XSingleColorJobParams`, `AD5XUploadParams`, `AD5XMaterialMapping`
- `Product` enum for modern printer model identification
- LED control for legacy TCP clients
- Thumbnail fetching for legacy TCP clients via `getThumbnail`
- GitHub Actions CI/CD workflow for automated publish to GitHub Package Registry

### Fixed

- Homing command (`G28`) incorrectly triggering a short timeout — extended to 15 s
- M661 local file list response parsing rewritten to handle varied firmware delimiter patterns
- `Commands` / `Endpoints` constant lookup inconsistencies on initial port
- `FlashForgeTcpClient` shutdown race condition
- AD5X job info parsing returning incomplete data
- `NetworkUtils.isOk` usage corrected across response handlers

[Unreleased]: https://github.com/GhostTypes/ff-5mp-api-ts/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/GhostTypes/ff-5mp-api-ts/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/GhostTypes/ff-5mp-api-ts/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/GhostTypes/ff-5mp-api-ts/releases/tag/v1.0.0
