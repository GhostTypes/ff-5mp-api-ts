# Material Station (IFS) Implementation Specification

**Status:** Updated
**Version:** 1.1.1
**Date:** 2026-02-11
**Printer Models:** AD5X Series
**API Version:** HTTP API (Port 8898)

## Table of Contents

1. [Overview](#overview)
2. [Firmware-Derived Command Behavior](#firmware-derived-command-behavior)
3. [Material and Color Datasets](#material-and-color-datasets)
4. [Validation Policy](#validation-policy)
5. [State Machine Enums](#state-machine-enums)
6. [Type Definitions](#type-definitions)
7. [API Design](#api-design)
8. [Implementation Details](#implementation-details)
9. [Testing Strategy](#testing-strategy)
10. [Usage Examples](#usage-examples)
11. [Appendix](#appendix)

---

## Overview

This specification defines the AD5X Intelligent Filament Station (IFS) API surface for `@ghosttypes/ff-api` using the latest reverse engineering baseline:

- `docs/ad5x/AD5X-1.2.1-1.1.1-3.0.7-20251217-Factory/ifs-material-config-dialog.md`
- `clean_for_production/ad5x/endpoints/endpoints_ad5x_1.2.1.yaml`

This revision adds:

- Independent path support (`ipdMsConfig_cmd`, `ipdMs_cmd`)
- Full valid UI material list and extended firmware-recognized types
- Full 24-color firmware palette
- Explicit slot routing and persistence behavior
- Validation modes aligned to firmware behavior (strict UI vs compatible vs pass-through)

---

## Firmware-Derived Command Behavior

### Command Surface

| Command | Args | Intended Path | Observed Behavior |
|---|---|---|---|
| `msConfig_cmd` | `slot`, `mt`, `rgb` | IFS slot config | Slot `1..4` persist to `ffmType1..4` / `ffmColor1..4`; slot `0` is a no-op |
| `ipdMsConfig_cmd` | `mt`, `rgb` | Independent path config | Persists to slot `0` (`ffmType0`, `ffmColor0`) |
| `ms_cmd` | `action`, `slot` | IFS operations | `action`: `0=load`, `1=unload`, `2=cancel`; slot expected `1..4` |
| `ipdMs_cmd` | `action` | Independent operations | `action`: `0=load`, `1=unload`, `2=cancel`; implicit slot `0` |

### Payload Shapes

`msConfig_cmd`:

```json
{
  "cmd": "msConfig_cmd",
  "args": {
    "slot": 1,
    "mt": "PLA",
    "rgb": "#FFFFFF"
  }
}
```

`ipdMsConfig_cmd`:

```json
{
  "cmd": "ipdMsConfig_cmd",
  "args": {
    "mt": "PLA",
    "rgb": "#FFFFFF"
  }
}
```

`ms_cmd`:

```json
{
  "cmd": "ms_cmd",
  "args": {
    "action": 0,
    "slot": 1
  }
}
```

`ipdMs_cmd`:

```json
{
  "cmd": "ipdMs_cmd",
  "args": {
    "action": 0
  }
}
```

### Signal and Routing Notes (Important)

- `emitSetMsConfig(int, QString, QString)` is emitted as `(slot, rgb, mt)`.
- `emitSetIpdMsConfig(QString, QString)` is emitted as `(rgb, mt)`.
- MainWindow handlers treat argument 2 as color and argument 3 as material.

### Persistence and Routing Rules

- `msConfig_cmd` writes only for slot `1..4`.
- `msConfig_cmd` with slot `0` is a no-op.
- `ipdMsConfig_cmd` always writes slot `0`.
- Persisted keys under `FFMInfo`:
  - `ffmType0..4`
  - `ffmColor0..4`
- Both config paths trigger immediate `Filament::updateSlotStatus` UI refresh when filament singleton exists.

### Firmware Validation Reality

Firmware-side handlers do not strictly validate material or color strings:

- Arbitrary `mt` and `rgb` strings can be persisted.
- Invalid colors can break UI style/icon resolution.

Client-side validation is therefore mandatory for predictable behavior.

---

## Material and Color Datasets

### UI Material Type Set (Strict UI-Compatible)

```text
PLA
PLA-CF
ABS
PETG
PETG-CF
TPU
SILK
```

### Extended Firmware-Recognized Material Strings

```text
PC-ABS
PET-CF
PPS-CF
PC
PA-CF
PA
PAHT-CF
```

### Canonical Combined Material Set

```text
PLA, PLA-CF, ABS, PETG, PETG-CF, TPU, SILK,
PC-ABS, PET-CF, PPS-CF, PC, PA-CF, PA, PAHT-CF
```

### AD5X 24-Color Palette (Hardcoded)

```text
#FFFFFF
#FEF043
#DCF478
#0ACC38
#067749
#0C6283
#0DE2A0
#75D9F3
#45A8F9
#2750E0
#46328E
#A03CF7
#F330F9
#D4B0DC
#F95D73
#F72224
#7C4B00
#F98D33
#FDEBD5
#D3C4A3
#AF7836
#898989
#BCBCBC
#161616
```

Special note: `#161616` is special-cased in firmware UI style logic.

---

## Validation Policy

### Validation Modes

Use explicit validation modes to match product requirements:

- `strict_ui`
  - `mt` must be in the 7-item UI set.
  - `rgb` must exactly match one of the 24 palette values.
- `compatible_extended`
  - `mt` must be in the 14-item combined set.
  - `rgb` must match `^#[0-9A-F]{6}$`.
  - If color is not in palette, allow but warn in logs/telemetry.
- `pass_through`
  - Non-empty `mt` and non-empty `rgb` only.
  - Use when replaying existing device state or forensic tooling.

Default recommendation for SDK APIs: `strict_ui`.

### User-Facing UI Policy (Decision)

For end-user UI in `@ghosttypes/ff-api` integrations, selection must be locked to `strict_ui`:

- Material types: only 7 UI types (`PLA`, `PLA-CF`, `ABS`, `PETG`, `PETG-CF`, `TPU`, `SILK`).
- Colors: only the 24 hardcoded AD5X palette colors.
- UI must be picker-based; do not expose free-text material entry or custom color input.

`compatible_extended` and `pass_through` are non-UI/internal modes and must not be used for normal user pickers.

### Slot Rules

- `setSlotMaterial`: slot `1..4` only.
- `setIndependentMaterial`: implicit slot `0` via `ipdMsConfig_cmd`.
- Never call `msConfig_cmd` with slot `0` unless intentionally testing no-op behavior.

---

## State Machine Enums

`matlStationInfo.stateAction` values:

| Value | Name | Meaning |
|---|---|---|
| 0 | Idle | No operation in progress |
| 2 | LoadStep2 | Load operation in progress |
| 3 | LoadStep3 | Load operation near completion |
| 4 | UnloadStep2 | Unload operation in progress |
| 5 | UnloadStep3 | Unload operation near completion |
| 6 | Complete | Operation completed |

`matlStationInfo.stateStep` values:

| Value | Name | Meaning |
|---|---|---|
| 0 | Idle | No operation in progress |
| 1 | Load | Load operation category |
| 2 | Unload | Unload operation category |
| 3 | Cancel | Cancel operation category |

These values are read from `/detail` in `matlStationInfo` and should be exposed as enums for strongly typed operation monitoring.

---

## Type Definitions

```typescript
export type MaterialValidationMode = 'strict_ui' | 'compatible_extended' | 'pass_through';

export type MaterialSlot = 1 | 2 | 3 | 4;

export enum MaterialStateAction {
  Idle = 0,
  LoadStep2 = 2,
  LoadStep3 = 3,
  UnloadStep2 = 4,
  UnloadStep3 = 5,
  Complete = 6
}

export enum MaterialStateStep {
  Idle = 0,
  Load = 1,
  Unload = 2,
  Cancel = 3
}

export interface SlotInfo {
  slotId: number;
  hasFilament: boolean;
  materialName: string;
  materialColor: string;
}

export interface MatlStationInfo {
  slotCnt: number;
  currentSlot: number;
  currentLoadSlot: number;
  stateAction: MaterialStateAction;
  stateStep: MaterialStateStep;
  slotInfos: SlotInfo[];
}

export const AD5X_UI_MATERIAL_TYPES = [
  'PLA', 'PLA-CF', 'ABS', 'PETG', 'PETG-CF', 'TPU', 'SILK'
] as const;

export const AD5X_EXTENDED_MATERIAL_TYPES = [
  'PC-ABS', 'PET-CF', 'PPS-CF', 'PC', 'PA-CF', 'PA', 'PAHT-CF'
] as const;

export const AD5X_ALL_MATERIAL_TYPES = [
  ...AD5X_UI_MATERIAL_TYPES,
  ...AD5X_EXTENDED_MATERIAL_TYPES
] as const;

export const AD5X_COLOR_PALETTE = [
  '#FFFFFF', '#FEF043', '#DCF478', '#0ACC38', '#067749', '#0C6283',
  '#0DE2A0', '#75D9F3', '#45A8F9', '#2750E0', '#46328E', '#A03CF7',
  '#F330F9', '#D4B0DC', '#F95D73', '#F72224', '#7C4B00', '#F98D33',
  '#FDEBD5', '#D3C4A3', '#AF7836', '#898989', '#BCBCBC', '#161616'
] as const;

export type UICompatibleMaterialType = typeof AD5X_UI_MATERIAL_TYPES[number];
export type ExtendedMaterialType = typeof AD5X_EXTENDED_MATERIAL_TYPES[number];
export type AnyKnownMaterialType = typeof AD5X_ALL_MATERIAL_TYPES[number];

export interface MsConfigCommandArgs {
  slot: MaterialSlot;
  mt: string;
  rgb: string; // canonical form: #RRGGBB
}

export interface IpdMsConfigCommandArgs {
  mt: string;
  rgb: string; // canonical form: #RRGGBB
}

export enum MsCommandAction {
  Load = 0,
  Unload = 1,
  Cancel = 2
}

export interface MsCommandArgs {
  action: MsCommandAction;
  slot: MaterialSlot;
}

export interface IpdMsCommandArgs {
  action: MsCommandAction;
}
```

---

## API Design

### Public API

```typescript
export interface MaterialValidationOptions {
  validationMode?: MaterialValidationMode;
}

export class MaterialStation {
  public async getStatus(): Promise<MatlStationInfo>;

  // IFS slots (1-4)
  public async setSlotMaterial(
    slot: MaterialSlot,
    materialType: string,
    color: string,
    options?: MaterialValidationOptions
  ): Promise<boolean>;

  public async loadSlot(slot: MaterialSlot): Promise<boolean>;
  public async unloadSlot(slot: MaterialSlot): Promise<boolean>;
  public async cancelOperation(slot: MaterialSlot): Promise<boolean>;

  // Independent path (slot 0)
  public async setIndependentMaterial(
    materialType: string,
    color: string,
    options?: MaterialValidationOptions
  ): Promise<boolean>;

  public async loadIndependent(): Promise<boolean>;
  public async unloadIndependent(): Promise<boolean>;
  public async cancelIndependent(): Promise<boolean>;

  // IFS error management
  public async clearError(errorCode: IFSError): Promise<boolean>;
  public async getActiveError(): Promise<IFSLErrorInfo | null>;
}
```

### Commands Constants

```typescript
export class Commands {
  static readonly MsConfigCmd = 'msConfig_cmd';
  static readonly IpdMsConfigCmd = 'ipdMsConfig_cmd';
  static readonly MsCmd = 'ms_cmd';
  static readonly IpdMsCmd = 'ipdMs_cmd';
}
```

---

## Implementation Details

### Color Normalization

```typescript
function normalizeColor(input: string): string {
  const raw = input.trim().toUpperCase();
  const withPrefix = raw.startsWith('#') ? raw : `#${raw}`;

  if (!/^#[0-9A-F]{6}$/.test(withPrefix)) {
    throw new Error(`Invalid color format: ${input}. Expected #RRGGBB or RRGGBB`);
  }

  return withPrefix;
}
```

### Material and Color Validation

```typescript
function validateMaterialAndColor(
  materialType: string,
  color: string,
  mode: MaterialValidationMode = 'strict_ui'
): { mt: string; rgb: string } {
  const mt = materialType.trim();
  const rgb = normalizeColor(color);

  if (!mt) {
    throw new Error('Material type cannot be empty');
  }

  if (mode === 'strict_ui') {
    if (!AD5X_UI_MATERIAL_TYPES.includes(mt as UICompatibleMaterialType)) {
      throw new Error(`Unsupported UI material type: ${mt}`);
    }

    if (!AD5X_COLOR_PALETTE.includes(rgb as (typeof AD5X_COLOR_PALETTE)[number])) {
      throw new Error(`Unsupported AD5X palette color: ${rgb}`);
    }
  } else if (mode === 'compatible_extended') {
    if (!AD5X_ALL_MATERIAL_TYPES.includes(mt as AnyKnownMaterialType)) {
      throw new Error(`Unsupported known AD5X material type: ${mt}`);
    }
  }

  return { mt, rgb };
}
```

### Command Senders

```typescript
private async sendMsConfigCommand(args: MsConfigCommandArgs): Promise<boolean> {
  const response = await this.client.control.sendControlCommand(Commands.MsConfigCmd, args);
  const parsed = JSON.parse(response) as GenericResponse;
  return NetworkUtils.isOk(parsed.code);
}

private async sendIpdMsConfigCommand(args: IpdMsConfigCommandArgs): Promise<boolean> {
  const response = await this.client.control.sendControlCommand(Commands.IpdMsConfigCmd, args);
  const parsed = JSON.parse(response) as GenericResponse;
  return NetworkUtils.isOk(parsed.code);
}

private async sendMsCommand(args: MsCommandArgs): Promise<boolean> {
  const response = await this.client.control.sendControlCommand(Commands.MsCmd, args);
  const parsed = JSON.parse(response) as GenericResponse;
  return NetworkUtils.isOk(parsed.code);
}

private async sendIpdMsCommand(args: IpdMsCommandArgs): Promise<boolean> {
  const response = await this.client.control.sendControlCommand(Commands.IpdMsCmd, args);
  const parsed = JSON.parse(response) as GenericResponse;
  return NetworkUtils.isOk(parsed.code);
}
```

### SDK Safety Rules

- Validate slot range on client before sending commands.
- Keep `setSlotMaterial` and `setIndependentMaterial` separate APIs to avoid slot-0 confusion.
- Do not silently map slot `0` to `ipdMsConfig_cmd`; require explicit independent APIs.
- For `compatible_extended`, emit warning telemetry for non-palette colors.

---

## Testing Strategy

### Unit Tests

- `setSlotMaterial` serializes `msConfig_cmd` with slot `1..4`.
- `setIndependentMaterial` serializes `ipdMsConfig_cmd` with no slot field.
- `loadIndependent`/`unloadIndependent`/`cancelIndependent` serialize `ipdMs_cmd` with actions `0/1/2`.
- Validation mode tests:
  - `strict_ui` accepts only 7 UI materials and 24 colors.
  - `compatible_extended` accepts all 14 materials.
  - `pass_through` accepts arbitrary non-empty strings.

### Integration Tests (AD5X Hardware)

- Verify `msConfig_cmd` with slot `0` does not change persisted values.
- Verify `ipdMsConfig_cmd` updates `indepMatlInfo` / slot `0` material metadata.
- Verify immediate UI reflection via `/detail` polling after each config command.
- Verify color round-trip for all 24 palette values.

---

## Usage Examples

### Configure IFS Slot With Strict UI Validation

```typescript
await client.materialStation.setSlotMaterial(
  1,
  'PLA',
  '#FFFFFF',
  { validationMode: 'strict_ui' }
);
```

### Configure Independent Path (Slot 0)

```typescript
await client.materialStation.setIndependentMaterial(
  'PETG',
  '#FEF043',
  { validationMode: 'strict_ui' }
);

await client.materialStation.loadIndependent();
```

### Extended Material Mode

```typescript
await client.materialStation.setSlotMaterial(
  2,
  'PAHT-CF',
  '#A03CF7',
  { validationMode: 'compatible_extended' }
);
```

---

## Appendix

### A. Full Material Lists

UI-compatible:

- `PLA`
- `PLA-CF`
- `ABS`
- `PETG`
- `PETG-CF`
- `TPU`
- `SILK`

Extended recognized strings:

- `PC-ABS`
- `PET-CF`
- `PPS-CF`
- `PC`
- `PA-CF`
- `PA`
- `PAHT-CF`

### B. Full AD5X Palette

1. `#FFFFFF`
2. `#FEF043`
3. `#DCF478`
4. `#0ACC38`
5. `#067749`
6. `#0C6283`
7. `#0DE2A0`
8. `#75D9F3`
9. `#45A8F9`
10. `#2750E0`
11. `#46328E`
12. `#A03CF7`
13. `#F330F9`
14. `#D4B0DC`
15. `#F95D73`
16. `#F72224`
17. `#7C4B00`
18. `#F98D33`
19. `#FDEBD5`
20. `#D3C4A3`
21. `#AF7836`
22. `#898989`
23. `#BCBCBC`
24. `#161616`

### C. Firmware Helper Behavior (Material-Dependent)

These are used by firmware helpers and UI logic; include for integration/debug parity.

- `getFilamentTypeTemp`
  - `TPU`, `SILK` -> `230`
  - `PC-ABS`, `PETG`, `PETG-CF` -> `250`
  - fallback -> `220`
- `getFilamentTypeTime`
  - `TPU`, `SILK` -> `36`
  - others -> `15`
- `getFilamentTypeLoadFristSpace`
  - `PETG` -> `70`
  - others -> `80`
- `getFilamentTypeLoadSpace`
  - `TPU`, `PETG` -> `50`
  - `PETG-CF` -> `40`
  - others -> `60`
- `getFilamentTypeUnloadSpeed`
  - `PETG` -> `300`
  - `TPU` -> `200`
  - `SILK` -> `600`
  - others -> `300`
- `getFilamentTypeUnloadSpace`
  - returns `60`
- `updateFilamentTemp`
  - `PET-CF`, `PPS-CF` -> `280`
  - `PC` -> `290`
  - `PA-CF` -> `274`
  - `PC-ABS` -> `270`
  - `PA` -> `230`
  - `PLA`, `PLA-CF` -> `220`
  - `SILK` -> `230`
  - `PAHT-CF` -> `305`
  - `TPU` -> `250`
  - fallback -> `230`

### D. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.1.1 | 2026-02-11 | Codex | Locked user-facing UI policy to `strict_ui` with picker-only 7 material types and 24 palette colors |
| 1.1.0 | 2026-02-11 | Codex | Added independent path commands, full material/color datasets, validation modes, and firmware-derived routing rules |
| 1.0.0 | 2025-02-07 | Claude Code | Initial specification |

---

**End of Specification**
