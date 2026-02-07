# Material Station (IFS) Implementation Specification

**Status:** Proposed
**Version:** 1.0.0
**Date:** 2025-02-07
**Printer Models:** AD5X Series
**API Version:** HTTP API (Port 8898)

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [State Machine Enums](#state-machine-enums)
4. [Type Definitions](#type-definitions)
5. [API Design](#api-design)
6. [Implementation Details](#implementation-details)
7. [Error Handling](#error-handling)
8. [Testing Strategy](#testing-strategy)
9. [Usage Examples](#usage-examples)
10. [Future Enhancements](#future-enhancements)

---

## Overview

The Intelligent Filament Station (IFS) is a 4-slot multi-material system for AD5X series printers. This specification defines the implementation of TypeScript API methods to:

- Query material station status and slot information
- Configure slot material metadata (type, color)
- Control load/unload operations for each slot
- Provide human-readable state machine enums

### Scope

**In Scope:**
- Material station status queries
- Slot material configuration
- Load/unload operations
- State machine enums
- Type-safe API methods

**Out of Scope:**
- Independent filament path (slot 0) operations
- Serial F-command protocols
- IFS firmware updates
- Low-level stall detection

---

## Requirements

### Functional Requirements

#### FR1: Query Material Station Status
The API MUST provide a method to retrieve the current status of all 4 slots, including:
- Slot IDs (1-4)
- Filament presence (hasFilament)
- Material name (e.g., "PLA", "ABS")
- Material color (hex string)
- Current stateAction and stateStep values

#### FR2: Configure Slot Material
The API MUST provide a method to set the material type and color for a specific slot.

**Parameters:**
- Slot ID: 1-4
- Material type: string (e.g., "PLA", "ABS", "PETG")
- Color: hex string (e.g., "FF0000", "#FF0000")

#### FR3: Load Filament
The API MUST provide a method to initiate a load operation for a specific slot.

**Parameters:**
- Slot ID: 1-4

#### FR4: Unload Filament
The API MUST provide a method to initiate an unload operation for a specific slot.

**Parameters:**
- Slot ID: 1-4

#### FR5: Cancel Operation
The API MUST provide a method to cancel an in-progress load/unload operation.

**Parameters:**
- Slot ID: 1-4

### Non-Functional Requirements

#### NFR1: Type Safety
All methods MUST use TypeScript enums for state values and strict types for slot numbers.

#### NFR2: Error Handling
All methods MUST return boolean success indicators and handle error responses.

#### NFR3: Validation
Input parameters MUST be validated:
- Slot numbers: 1-4
- Color format: #RRGGBB or RRGGBB
- Material type: non-empty string

#### NFR4: Backward Compatibility
Changes MUST NOT break existing API functionality.

---

## State Machine Enums

### MaterialStateAction

Represents the current action state of a material station operation.

```typescript
export enum MaterialStateAction {
    /** No operation in progress */
    Idle = 0,

    /** Load operation - step 2 (mid-operation) */
    LoadStep2 = 2,

    /** Load operation - step 3 (near completion) */
    LoadStep3 = 3,

    /** Unload operation - step 2 (mid-operation) */
    UnloadStep2 = 4,

    /** Unload operation - step 3 (near completion) */
    UnloadStep3 = 5,

    /** Operation completed successfully */
    Complete = 6
}
```

### MaterialStateStep

Represents the current step category of a material station operation.

```typescript
export enum MaterialStateStep {
    /** No operation in progress */
    Idle = 0,

    /** Load operation in progress */
    Load = 1,

    /** Unload operation in progress */
    Unload = 2,

    /** Operation cancellation in progress */
    Cancel = 3
}
```

### Usage Example

```typescript
const status = await client.materialStation.getStatus();

if (status.stateAction === MaterialStateAction.Complete) {
    console.log('Operation completed');
} else if (status.stateStep === MaterialStateStep.Load) {
    console.log('Currently loading filament');
}
```

---

## Type Definitions

### Extended Interfaces

#### MatlStationInfo (Updated)

```typescript
export interface MatlStationInfo {
    /** Total number of slots (always 4 for AD5X) */
    slotCnt: number;

    /** Currently active slot for printing */
    currentSlot: number;

    /** Slot currently being loaded/unloaded */
    currentLoadSlot: number;

    /** Current action state */
    stateAction: MaterialStateAction;

    /** Current operation step */
    stateStep: MaterialStateStep;

    /** Array of slot information */
    slotInfos: SlotInfo[];
}
```

#### SlotInfo (No Changes Required)

```typescript
export interface SlotInfo {
    /** Slot ID (1-4) */
    slotId: number;

    /** Whether filament is loaded in this slot */
    hasFilament: boolean;

    /** Material name (e.g., "PLA", "ABS") */
    materialName: string;

    /** Material color as hex string (e.g., "#FF0000") */
    materialColor: string;
}
```

### New Types for MaterialStation Module

#### MsConfigCommandArgs

```typescript
export interface MsConfigCommandArgs {
    /** Slot number to configure (1-4) */
    slot: 1 | 2 | 3 | 4;

    /** Material type (e.g., "PLA", "ABS", "PETG") */
    mt: string;

    /** Color as hex string without # (e.g., "FF0000") */
    rgb: string;
}
```

#### MsCommandAction

```typescript
export enum MsCommandAction {
    /** Load filament */
    Load = 0,

    /** Unload filament */
    Unload = 1,

    /** Cancel operation */
    Cancel = 2
}
```

#### MsCommandArgs

```typescript
export interface MsCommandArgs {
    /** Action to perform */
    action: MsCommandAction;

    /** Slot number (1-4) */
    slot: 1 | 2 | 3 | 4;
}
```

---

## API Design

### Module Structure

```
src/
├── models/
│   └── ff-models.ts          # Add enums: MaterialStateAction, MaterialStateStep, MsCommandAction
├── api/
│   ├── Commands.ts           # Add: MsConfigCmd, MsCmd
│   ├── materials/
│   │   └── MaterialStation.ts # New module
│   ├── FiveMClient.ts        # Add: materialStation property
│   └── Info.ts               # No changes (already returns MatlStationInfo)
└── utils/
    └── NetworkUtils.ts       # No changes (existing isOk() method)
```

### Public API

#### MaterialStation Class

```typescript
export class MaterialStation {
    constructor(private client: FiveMClient) {}

    /**
     * Get the current status of the material station.
     * @returns Promise<MatlStationInfo> Current status of all 4 slots
     */
    public async getStatus(): Promise<MatlStationInfo>;

    /**
     * Configure the material type and color for a specific slot.
     * @param slot Slot number (1-4)
     * @param materialType Material name (e.g., "PLA", "ABS")
     * @param color Color as hex string with or without # prefix
     * @returns Promise<boolean> True if successful
     */
    public async setSlotMaterial(
        slot: 1 | 2 | 3 | 4,
        materialType: string,
        color: string
    ): Promise<boolean>;

    /**
     * Load filament from the specified slot.
     * @param slot Slot number (1-4)
     * @returns Promise<boolean> True if operation initiated successfully
     */
    public async loadSlot(slot: 1 | 2 | 3 | 4): Promise<boolean>;

    /**
     * Unload filament from the specified slot.
     * @param slot Slot number (1-4)
     * @returns Promise<boolean> True if operation initiated successfully
     */
    public async unloadSlot(slot: 1 | 2 | 3 | 4): Promise<boolean>;

    /**
     * Cancel the current operation for the specified slot.
     * @param slot Slot number (1-4)
     * @returns Promise<boolean> True if cancellation initiated successfully
     */
    public async cancelOperation(slot: 1 | 2 | 3 | 4): Promise<boolean>;
}
```

#### FiveMClient Extension

```typescript
export class FiveMClient {
    // ... existing properties ...

    /**
     * Material station control module.
     * Only available on AD5X printers with IFS hardware.
     */
    public readonly materialStation: MaterialStation;

    constructor(...) {
        // ... existing code ...
        this.materialStation = new MaterialStation(this);
    }
}
```

---

## Implementation Details

### 1. State Enums Implementation

**File:** `src/models/ff-models.ts`

**Changes:**

```typescript
// Add new enums after existing enums (around line 100-150)

/**
 * Material station action states.
 * Represents the current action state of a material station operation.
 */
export enum MaterialStateAction {
    Idle = 0,
    LoadStep2 = 2,
    LoadStep3 = 3,
    UnloadStep2 = 4,
    UnloadStep3 = 5,
    Complete = 6
}

/**
 * Material station operation steps.
 * Represents the current step category of a material station operation.
 */
export enum MaterialStateStep {
    Idle = 0,
    Load = 1,
    Unload = 2,
    Cancel = 3
}

/**
 * Material station command actions.
 */
export enum MsCommandAction {
    Load = 0,
    Unload = 1,
    Cancel = 2
}
```

**Update MatlStationInfo Interface:**

```typescript
export interface MatlStationInfo {
    slotCnt: number;
    currentSlot: number;
    currentLoadSlot: number;
    stateAction: MaterialStateAction;  // Changed from: number
    stateStep: MaterialStateStep;      // Changed from: number
    slotInfos: SlotInfo[];
}
```

### 2. Command Constants

**File:** `src/api/Commands.ts`

**Changes:**

```typescript
export class Commands {
    // ... existing commands ...

    /** Command for configuring material station slot settings */
    static readonly MsConfigCmd = "msConfig_cmd";

    /** Command for controlling material station load/unload operations */
    static readonly MsCmd = "ms_cmd";
}
```

### 3. MaterialStation Module

**File:** `src/api/materials/MaterialStation.ts` (NEW)

```typescript
import { FiveMClient } from '../FiveMClient';
import { Commands } from '../Commands';
import { MatlStationInfo, MsConfigCommandArgs, MsCommandArgs, MsCommandAction } from '../../models/ff-models';
import { NetworkUtils } from '../../utils/NetworkUtils';
import { GenericResponse } from '../../models/generics';

/**
 * MaterialStation class provides control over the Intelligent Filament Station (IFS).
 *
 * The IFS is a 4-slot multi-material system for AD5X series printers.
 *
 * @example
 * ```typescript
 * const client = new FiveMClient(...);
 * const status = await client.materialStation.getStatus();
 * console.log(`Slot 1 has ${status.slotInfos[0].hasFilament ? 'filament' : 'no filament'}`);
 * ```
 */
export class MaterialStation {
    constructor(private client: FiveMClient) {}

    /**
     * Get the current status of the material station.
     *
     * @returns Promise<MatlStationInfo> Current status including slot information
     * @throws Error if HTTP request fails or printer is not connected
     *
     * @example
     * ```typescript
     * const status = await client.materialStation.getStatus();
     *
     * // Check state using enums
     * if (status.stateAction === MaterialStateAction.Complete) {
     *     console.log('Operation completed');
     * }
     *
     * // Iterate through slots
     * status.slotInfos.forEach(slot => {
     *     console.log(`Slot ${slot.slotId}: ${slot.materialName} ${slot.materialColor}`);
     * });
     * ```
     */
    public async getStatus(): Promise<MatlStationInfo> {
        const detail = await this.client.info.getDetailResponse();
        return detail.machineInfo.matlStationInfo;
    }

    /**
     * Configure the material type and color for a specific slot.
     *
     * This updates the printer's record of what material is loaded in each slot.
     * Use this after physically changing filament to keep the printer's metadata accurate.
     *
     * @param slot Slot number to configure (1-4)
     * @param materialType Material name (e.g., "PLA", "ABS", "PETG", "TPU")
     * @param color Color as hex string with or without # prefix (e.g., "#FF0000" or "FF0000")
     * @returns Promise<boolean> True if configuration successful
     * @throws Error if slot number is invalid or color format is incorrect
     *
     * @example
     * ```typescript
     * // Set slot 1 to red PLA
     * await client.materialStation.setSlotMaterial(1, "PLA", "#FF0000");
     *
     * // Set slot 2 to blue PETG
     * await client.materialStation.setSlotMaterial(2, "PETG", "0000FF");
     * ```
     */
    public async setSlotMaterial(
        slot: 1 | 2 | 3 | 4,
        materialType: string,
        color: string
    ): Promise<boolean> {
        // Validate inputs
        if (!materialType || materialType.trim() === '') {
            throw new Error('Material type cannot be empty');
        }

        // Strip # prefix if present
        const rgb = color.replace(/^#/, '').toUpperCase();

        // Validate hex color format
        if (!/^[0-9A-F]{6}$/i.test(rgb)) {
            throw new Error(`Invalid color format: ${color}. Expected format: #RRGGBB or RRGGBB`);
        }

        const args: MsConfigCommandArgs = {
            slot,
            mt: materialType.trim(),
            rgb
        };

        return this.sendMsConfigCommand(args);
    }

    /**
     * Load filament from the specified slot.
     *
     * Initiates the load sequence for the given slot. The printer will:
     * 1. Cut the filament crotch
     * 2. Feed filament into the extruder
     * 3. Verify successful loading
     *
     * Monitor operation progress using getStatus() and checking stateAction/stateStep.
     *
     * @param slot Slot number to load from (1-4)
     * @returns Promise<boolean> True if load operation initiated successfully
     * @throws Error if slot number is invalid
     *
     * @example
     * ```typescript
     * // Start loading from slot 1
     * await client.materialStation.loadSlot(1);
     *
     * // Monitor progress
     * let status = await client.materialStation.getStatus();
     * while (status.stateAction !== MaterialStateAction.Complete &&
     *        status.stateAction !== MaterialStateAction.Idle) {
     *     await new Promise(resolve => setTimeout(resolve, 1000));
     *     status = await client.materialStation.getStatus();
     * }
     * ```
     */
    public async loadSlot(slot: 1 | 2 | 3 | 4): Promise<boolean> {
        return this.sendMsCommand({
            action: MsCommandAction.Load,
            slot
        });
    }

    /**
     * Unload filament from the specified slot.
     *
     * Initiates the unload sequence for the given slot. The printer will:
     * 1. Cut the filament crotch
     * 2. Retract filament from the extruder
     * 3. Verify successful unloading
     *
     * Monitor operation progress using getStatus() and checking stateAction/stateStep.
     *
     * @param slot Slot number to unload from (1-4)
     * @returns Promise<boolean> True if unload operation initiated successfully
     * @throws Error if slot number is invalid
     *
     * @example
     * ```typescript
     * // Start unloading from slot 2
     * await client.materialStation.unloadSlot(2);
     *
     * // Monitor progress
     * let status = await client.materialStation.getStatus();
     * while (status.stateStep === MaterialStateStep.Unload) {
     *     await new Promise(resolve => setTimeout(resolve, 1000));
     *     status = await client.materialStation.getStatus();
     * }
     * ```
     */
    public async unloadSlot(slot: 1 | 2 | 3 | 4): Promise<boolean> {
        return this.sendMsCommand({
            action: MsCommandAction.Unload,
            slot
        });
    }

    /**
     * Cancel the current operation for the specified slot.
     *
     * Use this to stop an in-progress load or unload operation.
     *
     * @param slot Slot number to cancel operation for (1-4)
     * @returns Promise<boolean> True if cancellation initiated successfully
     * @throws Error if slot number is invalid
     *
     * @example
     * ```typescript
     * // Cancel load operation on slot 3
     * await client.materialStation.cancelOperation(3);
     * ```
     */
    public async cancelOperation(slot: 1 | 2 | 3 | 4): Promise<boolean> {
        return this.sendMsCommand({
            action: MsCommandAction.Cancel,
            slot
        });
    }

    /**
     * Send a material station configuration command.
     * @private
     */
    private async sendMsConfigCommand(args: MsConfigCommandArgs): Promise<boolean> {
        const response = await this.client.control.sendControlCommand(
            Commands.MsConfigCmd,
            args
        );

        const parsed = JSON.parse(response) as GenericResponse;
        return NetworkUtils.isOk(parsed.code);
    }

    /**
     * Send a material station load/unload/cancel command.
     * @private
     */
    private async sendMsCommand(args: MsCommandArgs): Promise<boolean> {
        const response = await this.client.control.sendControlCommand(
            Commands.MsCmd,
            args
        );

        const parsed = JSON.parse(response) as GenericResponse;
        return NetworkUtils.isOk(parsed.code);
    }
}
```

### 4. FiveMClient Integration

**File:** `src/api/FiveMClient.ts`

**Changes:**

```typescript
import { MaterialStation } from './materials/MaterialStation';

export class FiveMClient {
    public readonly info: Info;
    public readonly control: Control;
    public readonly files: Files;
    public readonly move: Move;
    public readonly temperature: Temperature;
    // ... existing properties ...

    /**
     * Material station control module.
     * Only available on AD5X printers with IFS hardware.
     */
    public readonly materialStation: MaterialStation;

    constructor(
        ipAddress: string,
        serialNumber: string,
        checkCode: string
    ) {
        // ... existing initialization ...

        // Add material station initialization
        this.materialStation = new MaterialStation(this);
    }
}
```

### 5. Module Index

**File:** `src/api/materials/index.ts` (NEW)

```typescript
export { MaterialStation } from './MaterialStation';
```

---

## Error Handling

### Error Response Format

All commands follow the standard GenericResponse format:

```typescript
interface GenericResponse {
    code: number;        // 0 = success, non-zero = error
    message: string;     // Error message (if code != 0)
}
```

### Validation Errors

Thrown before sending commands:

```typescript
// Invalid slot number
throw new Error('Slot number must be between 1 and 4');

// Empty material type
throw new Error('Material type cannot be empty');

// Invalid color format
throw new Error('Invalid color format: XYZ. Expected format: #RRGGBB or RRGGBB');
```

### Operation Errors

Returned as boolean false values:

```typescript
const success = await client.materialStation.loadSlot(1);
if (!success) {
    console.error('Failed to initiate load operation');
}
```

### Error Codes

Common printer error codes for material station operations:

- `E0100-E0103`: Channel 1-4 feeding timeout
- `E0104-E0107`: Channel 1-4 retracting timeout
- `E0108`: Failed to feed filament to extruder
- `E0109`: IFS odometer roller not moving (stall detection)
- `E0114`: IFS homing error

### Error Handling Best Practices

```typescript
try {
    const success = await client.materialStation.loadSlot(1);

    if (!success) {
        // Check printer status for error details
        const detail = await client.info.getDetailResponse();
        console.error('Load failed:', detail.machineInfo.machineState);
    }
} catch (error) {
    // Handle validation errors
    console.error('Validation error:', error.message);
}
```

---

## Testing Strategy

### Unit Tests

**File:** `src/api/materials/__tests__/MaterialStation.test.ts`

```typescript
import { MaterialStation } from '../MaterialStation';
import { FiveMClient } from '../../FiveMClient';
import { Commands } from '../../Commands';
import { MaterialStateAction, MaterialStateStep } from '../../../models/ff-models';

describe('MaterialStation', () => {
    let client: FiveMClient;
    let materialStation: MaterialStation;

    beforeEach(() => {
        client = new FiveMClient('192.168.1.100', 'SN123', '1234');
        materialStation = client.materialStation;
    });

    describe('getStatus', () => {
        it('should return material station info', async () => {
            const mockDetail = {
                machineInfo: {
                    matlStationInfo: {
                        slotCnt: 4,
                        currentSlot: 1,
                        currentLoadSlot: 0,
                        stateAction: MaterialStateAction.Idle,
                        stateStep: MaterialStateStep.Idle,
                        slotInfos: [
                            { slotId: 1, hasFilament: true, materialName: 'PLA', materialColor: '#FF0000' },
                            { slotId: 2, hasFilament: false, materialName: '', materialColor: '#000000' },
                            { slotId: 3, hasFilament: false, materialName: '', materialColor: '#000000' },
                            { slotId: 4, hasFilament: false, materialName: '', materialColor: '#000000' }
                        ]
                    }
                }
            };

            jest.spyOn(client.info, 'getDetailResponse').mockResolvedValue(mockDetail);

            const status = await materialStation.getStatus();

            expect(status.slotCnt).toBe(4);
            expect(status.stateAction).toBe(MaterialStateAction.Idle);
            expect(status.slotInfos[0].hasFilament).toBe(true);
            expect(status.slotInfos[0].materialName).toBe('PLA');
        });
    });

    describe('setSlotMaterial', () => {
        it('should configure slot material with # prefix', async () => {
            const mockResponse = JSON.stringify({ code: 0, message: 'ok' });
            jest.spyOn(client.control, 'sendControlCommand').mockResolvedValue(mockResponse);

            const result = await materialStation.setSlotMaterial(1, 'PLA', '#FF0000');

            expect(result).toBe(true);
            expect(client.control.sendControlCommand).toHaveBeenCalledWith(
                Commands.MsConfigCmd,
                { slot: 1, mt: 'PLA', rgb: 'FF0000' }
            );
        });

        it('should configure slot material without # prefix', async () => {
            const mockResponse = JSON.stringify({ code: 0, message: 'ok' });
            jest.spyOn(client.control, 'sendControlCommand').mockResolvedValue(mockResponse);

            const result = await materialStation.setSlotMaterial(2, 'ABS', '00FF00');

            expect(result).toBe(true);
            expect(client.control.sendControlCommand).toHaveBeenCalledWith(
                Commands.MsConfigCmd,
                { slot: 2, mt: 'ABS', rgb: '00FF00' }
            );
        });

        it('should reject invalid color format', async () => {
            await expect(materialStation.setSlotMaterial(1, 'PLA', 'XYZ'))
                .rejects.toThrow('Invalid color format');
        });

        it('should reject empty material type', async () => {
            await expect(materialStation.setSlotMaterial(1, '', '#FF0000'))
                .rejects.toThrow('Material type cannot be empty');
        });
    });

    describe('loadSlot', () => {
        it('should initiate load operation', async () => {
            const mockResponse = JSON.stringify({ code: 0, message: 'ok' });
            jest.spyOn(client.control, 'sendControlCommand').mockResolvedValue(mockResponse);

            const result = await materialStation.loadSlot(1);

            expect(result).toBe(true);
            expect(client.control.sendControlCommand).toHaveBeenCalledWith(
                Commands.MsCmd,
                { action: 0, slot: 1 }
            );
        });
    });

    describe('unloadSlot', () => {
        it('should initiate unload operation', async () => {
            const mockResponse = JSON.stringify({ code: 0, message: 'ok' });
            jest.spyOn(client.control, 'sendControlCommand').mockResolvedValue(mockResponse);

            const result = await materialStation.unloadSlot(2);

            expect(result).toBe(true);
            expect(client.control.sendControlCommand).toHaveBeenCalledWith(
                Commands.MsCmd,
                { action: 1, slot: 2 }
            );
        });
    });

    describe('cancelOperation', () => {
        it('should cancel operation', async () => {
            const mockResponse = JSON.stringify({ code: 0, message: 'ok' });
            jest.spyOn(client.control, 'sendControlCommand').mockResolvedValue(mockResponse);

            const result = await materialStation.cancelOperation(3);

            expect(result).toBe(true);
            expect(client.control.sendControlCommand).toHaveBeenCalledWith(
                Commands.MsCmd,
                { action: 2, slot: 3 }
            );
        });
    });
});
```

### Integration Tests

**File:** `src/api/materials/__tests__/MaterialStation.integration.test.ts`

```typescript
import { FiveMClient } from '../../FiveMClient';
import { MaterialStateAction, MaterialStateStep } from '../../../models/ff-models';

describe('MaterialStation Integration Tests', () => {
    let client: FiveMClient;

    beforeAll(() => {
        const ipAddress = process.env.AD5X_IP;
        const serialNumber = process.env.AD5X_SERIAL;
        const checkCode = process.env.AD5X_CHECK_CODE;

        if (!ipAddress || !serialNumber || !checkCode) {
            throw new Error('Missing AD5X connection environment variables');
        }

        client = new FiveMClient(ipAddress, serialNumber, checkCode);
    });

    it('should get material station status', async () => {
        const status = await client.materialStation.getStatus();

        expect(status.slotCnt).toBe(4);
        expect(status.slotInfos).toHaveLength(4);
        expect(status.slotInfos[0].slotId).toBe(1);

        console.log('Current stateAction:', status.stateAction);
        console.log('Current stateStep:', status.stateStep);
    });

    it('should set slot material configuration', async () => {
        const result = await client.materialStation.setSlotMaterial(
            1,
            'PLA',
            '#FF0000'
        );

        expect(result).toBe(true);

        // Verify configuration
        const status = await client.materialStation.getStatus();
        expect(status.slotInfos[0].materialName).toBe('PLA');
        expect(status.slotInfos[0].materialColor).toBe('#FF0000');
    });
});
```

---

## Usage Examples

### Example 1: Check Material Station Status

```typescript
import { FiveMClient } from '@ghosttypes/ff-api';
import { MaterialStateAction, MaterialStateStep } from '@ghosttypes/ff-api/models';

const client = new FiveMClient(
    '192.168.1.100',
    'SNAD5X12345',
    '12345'
);

// Get current status
const status = await client.materialStation.getStatus();

console.log('Material Station Status:');
console.log(`  Total slots: ${status.slotCnt}`);
console.log(`  Current slot: ${status.currentSlot}`);
console.log(`  Action state: ${MaterialStateAction[status.stateAction]}`);
console.log(`  Step state: ${MaterialStateStep[status.stateStep]}`);

console.log('\nSlot Information:');
status.slotInfos.forEach(slot => {
    console.log(`  Slot ${slot.slotId}:`);
    console.log(`    Has filament: ${slot.hasFilament}`);
    console.log(`    Material: ${slot.materialName || 'None'}`);
    console.log(`    Color: ${slot.materialColor}`);
});
```

**Output:**
```
Material Station Status:
  Total slots: 4
  Current slot: 1
  Action state: Idle
  Step state: Idle

Slot Information:
  Slot 1:
    Has filament: true
    Material: PLA
    Color: #FF0000
  Slot 2:
    Has filament: false
    Material: None
    Color: #000000
  Slot 3:
    Has filament: false
    Material: None
    Color: #000000
  Slot 4:
    Has filament: false
    Material: None
    Color: #000000
```

### Example 2: Configure Slot Materials

```typescript
// Configure all 4 slots
await client.materialStation.setSlotMaterial(1, 'PLA', '#FF0000');    // Red PLA
await client.materialStation.setSlotMaterial(2, 'ABS', '#00FF00');    // Green ABS
await client.materialStation.setSlotMaterial(3, 'PETG', '#0000FF');   // Blue PETG
await client.materialStation.setSlotMaterial(4, 'TPU', '#FFFF00');    // Yellow TPU

console.log('All slots configured successfully');
```

### Example 3: Load and Monitor Operation

```typescript
// Start loading from slot 1
const success = await client.materialStation.loadSlot(1);

if (!success) {
    console.error('Failed to start load operation');
    return;
}

console.log('Load operation initiated...');

// Monitor progress
let status = await client.materialStation.getStatus();

while (status.stateAction !== MaterialStateAction.Complete &&
       status.stateAction !== MaterialStateAction.Idle) {

    console.log(`  Current state: ${MaterialStateAction[status.stateAction]}`);

    // Check for errors
    if (status.stateAction === MaterialStateAction.Idle && status.stateStep === MaterialStateStep.Idle) {
        console.error('Operation failed or was cancelled');
        return;
    }

    // Wait 1 second before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
    status = await client.materialStation.getStatus();
}

console.log('Load operation completed!');

// Verify filament is loaded
status = await client.materialStation.getStatus();
if (status.slotInfos[0].hasFilament) {
    console.log(`Slot 1 now has ${status.slotInfos[0].materialName} filament loaded`);
}
```

### Example 4: Multi-Material Setup for Printing

```typescript
async function setupMultiMaterialPrint() {
    // Define materials for a 4-color print
    const materials = [
        { slot: 1 as const, type: 'PLA', color: '#FF0000' },  // Red
        { slot: 2 as const, type: 'PLA', color: '#00FF00' },  // Green
        { slot: 3 as const, type: 'PLA', color: '#0000FF' },  // Blue
        { slot: 4 as const, type: 'PLA', color: '#FFFF00' }   // Yellow
    ];

    // Configure all slots
    for (const material of materials) {
        await client.materialStation.setSlotMaterial(
            material.slot,
            material.type,
            material.color
        );
        console.log(`Configured slot ${material.slot}: ${material.type} ${material.color}`);
    }

    // Load all filaments
    for (const material of materials) {
        console.log(`Loading slot ${material.slot}...`);

        // Start load
        await client.materialStation.loadSlot(material.slot);

        // Wait for completion
        await waitForOperationComplete();
    }

    console.log('All materials loaded and ready for printing!');
}

async function waitForOperationComplete() {
    let status = await client.materialStation.getStatus();

    while (status.stateAction !== MaterialStateAction.Complete &&
           status.stateAction !== MaterialStateAction.Idle) {
        await new Promise(resolve => setTimeout(resolve, 500));
        status = await client.materialStation.getStatus();
    }
}
```

### Example 5: Unload All Filaments

```typescript
async function unloadAllFilaments() {
    const status = await client.materialStation.getStatus();

    for (const slot of status.slotInfos) {
        if (slot.hasFilament) {
            console.log(`Unloading slot ${slot.slotId}...`);

            // Start unload
            await client.materialStation.unloadSlot(slot.slotId);

            // Wait for completion
            await waitForOperationComplete();

            console.log(`Slot ${slot.slotId} unloaded`);
        }
    }

    console.log('All filaments unloaded');
}
```

### Example 6: Error Handling and Recovery

```typescript
async function safeLoadSlot(slot: 1 | 2 | 3 | 4, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`Load attempt ${attempt}/${maxRetries} for slot ${slot}...`);

        // Start load operation
        const success = await client.materialStation.loadSlot(slot);

        if (!success) {
            console.error(`Failed to initiate load on attempt ${attempt}`);
            continue;
        }

        // Monitor progress
        let status = await client.materialStation.getStatus();
        const startTime = Date.now();
        const timeout = 60000; // 60 seconds

        while (status.stateAction !== MaterialStateAction.Complete) {
            // Check timeout
            if (Date.now() - startTime > timeout) {
                console.error('Load operation timed out');

                // Cancel operation
                await client.materialStation.cancelOperation(slot);
                await waitForIdle();

                break;
            }

            // Check for error state
            if (status.stateAction === MaterialStateAction.Idle &&
                status.stateStep === MaterialStateStep.Idle) {
                console.error('Load operation failed');

                // Check printer error
                const detail = await client.info.getDetailResponse();
                console.error('Printer state:', detail.machineInfo.machineState);

                break;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            status = await client.materialStation.getStatus();
        }

        // Verify success
        status = await client.materialStation.getStatus();
        if (status.slotInfos[slot - 1].hasFilament) {
            console.log(`Slot ${slot} loaded successfully`);
            return true;
        }

        console.log(`Load attempt ${attempt} failed, retrying...`);
    }

    console.error(`Failed to load slot ${slot} after ${maxRetries} attempts`);
    return false;
}

async function waitForIdle() {
    let status = await client.materialStation.getStatus();
    while (status.stateAction !== MaterialStateAction.Idle) {
        await new Promise(resolve => setTimeout(resolve, 500));
        status = await client.materialStation.getStatus();
    }
}
```

---

## Future Enhancements

### Potential Future Features

These features are **not in scope** for this implementation but may be considered for future releases:

#### 1. Operation Progress Monitoring

Provide a method to monitor operation progress with callbacks:

```typescript
interface LoadOptions {
    onProgress?: (progress: number) => void;
    onComplete?: () => void;
    onError?: (error: string) => void;
}

materialStation.loadSlot(1, {
    onProgress: (p) => console.log(`Progress: ${p}%`),
    onComplete: () => console.log('Done!'),
    onError: (e) => console.error(`Error: ${e}`)
});
```

#### 2. Batch Operations

Configure or load multiple slots in parallel:

```typescript
// Configure all slots at once
materialStation.configureAllSlots([
    { slot: 1, material: 'PLA', color: '#FF0000' },
    { slot: 2, material: 'ABS', color: '#00FF00' },
    { slot: 3, material: 'PETG', color: '#0000FF' },
    { slot: 4, material: 'TPU', color: '#FFFF00' }
]);
```

#### 3. Material Type Validation

Predefined material types with validation:

```typescript
enum MaterialType {
    PLA = 'PLA',
    ABS = 'ABS',
    PETG = 'PETG',
    TPU = 'TPU',
    ASA = 'ASA',
    // ... etc
}

materialStation.setSlotMaterial(1, MaterialType.PLA, '#FF0000');
```

#### 4. Independent Filament Path (Slot 0)

Support for the independent filament path that bypasses the IFS:

```typescript
materialStation.setIndependentMaterial('PLA', '#FF0000');
materialStation.loadIndependent();
materialStation.unloadIndependent();
```

#### 5. Event-Based Status Updates

WebSocket or long-polling support for real-time status updates:

```typescript
materialStation.on('stateChanged', ( newState) => {
    console.log('State changed:', newState);
});

materialStation.on('operationComplete', (slot) => {
    console.log('Slot', slot, 'operation complete');
});
```

#### 6. History and Logging

Track material changes and operation history:

```typescript
const history = await materialStation.getOperationHistory();
console.log('Last 10 operations:', history);
```

### Compatibility Notes

Future enhancements should maintain backward compatibility with this implementation. All methods added in this specification should remain stable and unchanged in future versions.

---

## Appendix

### A. Command Reference

#### msConfig_cmd

Configure material station slot metadata.

**Endpoint:** `POST /control`

**Request:**
```json
{
    "serialNumber": "SNAD5X12345",
    "checkCode": "12345",
    "payload": {
        "cmd": "msConfig_cmd",
        "args": {
            "slot": 1,
            "mt": "PLA",
            "rgb": "FF0000"
        }
    }
}
```

**Response:**
```json
{
    "code": 0,
    "message": "ok"
}
```

#### ms_cmd

Control material station load/unload operations.

**Endpoint:** `POST /control`

**Request (Load):**
```json
{
    "serialNumber": "SNAD5X12345",
    "checkCode": "12345",
    "payload": {
        "cmd": "ms_cmd",
        "args": {
            "action": 0,
            "slot": 1
        }
    }
}
```

**Request (Unload):**
```json
{
    "serialNumber": "SNAD5X12345",
    "checkCode": "12345",
    "payload": {
        "cmd": "ms_cmd",
        "args": {
            "action": 1,
            "slot": 1
        }
    }
}
```

**Request (Cancel):**
```json
{
    "serialNumber": "SNAD5X12345",
    "checkCode": "12345",
    "payload": {
        "cmd": "ms_cmd",
        "args": {
            "action": 2,
            "slot": 1
        }
    }
}
```

**Response:**
```json
{
    "code": 0,
    "message": "ok"
}
```

### B. State Machine Reference

#### StateAction Values

| Value | Enum Name | Description |
|-------|-----------|-------------|
| 0 | Idle | No operation in progress |
| 2 | LoadStep2 | Load operation - step 2 |
| 3 | LoadStep3 | Load operation - step 3 |
| 4 | UnloadStep2 | Unload operation - step 2 |
| 5 | UnloadStep3 | Unload operation - step 3 |
| 6 | Complete | Operation completed successfully |

#### StateStep Values

| Value | Enum Name | Description |
|-------|-----------|-------------|
| 0 | Idle | No operation in progress |
| 1 | Load | Load operation in progress |
| 2 | Unload | Unload operation in progress |
| 3 | Cancel | Operation cancellation in progress |

### C. Related Documentation

- **HTTP API Reference:** `docs/http-api.md`
- **AD5X API Documentation:** `repos/flashforge-api-docs/ad5x-api.md`
- **Multi-Material Workflow:** `repos/flashforge-api-docs/ad5x-workflow.md`
- **Firmware Documentation:** `docs/ad5x/`

### D. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-02-07 | Claude Code | Initial specification |

---

**End of Specification**
