# AD5X Control Commands Implementation Specification

**Status:** Proposed
**Version:** 1.0.0
**Date:** 2025-02-07
**Printer Models:** AD5X (primary), 5M/5M Pro (future support)
**API Version:** HTTP API (Port 8898)

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Capability Detection Strategy](#capability-detection-strategy)
4. [Error Code System](#error-code-system)
5. [Type Definitions](#type-definitions)
6. [API Design](#api-design)
7. [Implementation Details](#implementation-details)
8. [Error Handling](#error-handling)
9. [Testing Strategy](#testing-strategy)
10. [Usage Examples](#usage-examples)
11. [Future Enhancements](#future-enhancements)

---

## Overview

This specification defines the implementation of advanced printer control commands for the FlashForge API. These commands provide:

- **Printer renaming** - Change printer name (all models)
- **Manual axis movement** - Precise XYZ positioning (AD5X, future 5M)
- **Manual extrusion** - Extrude/retract filament (AD5X, future 5M)
- **Homing operations** - Home all axes (AD5X, future 5M)
- **Error code management** - Query and clear IFS errors (AD5X only)

### Current Firmware Support

| Command | AD5X | 5M | 5M Pro | Notes |
|---------|------|----|----|----|
| `reName_cmd` | ✅ | ✅ | ✅ | Available on all models |
| `moveCtrl_cmd` | ✅ | ❌ | ❌ | Expected in future 5M firmware |
| `extrudeCtrl_cmd` | ✅ | ❌ | ❌ | Expected in future 5M firmware |
| `homingCtrl_cmd` | ✅ | ❌ | ❌ | 5M has alternative via TCP |
| `errorCodeCtrl_cmd` | ✅ | ❌ | ❌ | IFS-specific, unlikely on 5M |

### Design Philosophy

**Runtime Capability Detection:** Commands automatically enable/disable based on capability flags in the `/detail` endpoint response. The detection logic:

1. **Check field presence** - If capability field doesn't exist → feature unavailable
2. **Check field value** - If field exists, must be exactly `1` (or `true` for boolean flags)

This approach ensures:

- ✅ No breaking changes when 5M firmware adds these features
- ✅ Automatic capability detection without manual code updates
- ✅ Type-safe API with proper capability checks
- ✅ Clear error messages when attempting unsupported operations
- ✅ Future-proof: when 5M firmware adds `moveCtrl: 1`, it automatically works

### Scope

**In Scope:**
- 5 control commands with full type safety
- Runtime capability detection system
- Comprehensive error code enums
- Cross-platform compatibility foundation
- Error clearing in MaterialStation module

**Out of Scope:**
- `stateCtrl_cmd` - Platform state management (purpose not fully understood)
- TCP G-code fallbacks for 5M (use existing `FlashForgeTcpClient`)

**Out of Scope:**
- TCP G-code fallbacks for 5M (use existing `FlashForgeTcpClient`)
- Real-time position monitoring (future enhancement)
- Movement queues or motion planning
- Custom homing sequences

---

## Requirements

### Functional Requirements

#### FR1: Printer Renaming (All Models)
The API MUST provide a method to rename the printer that works on all printer models.

#### FR2: Manual Axis Movement (AD5X, Future 5M)
The API MUST provide methods to manually move X, Y, and Z axes with distance deltas.

**Parameters:**
- Axis: "x", "y", or "z"
- Delta: distance in mm (positive/negative)

**Safety:**
- MUST block when printer is busy
- MUST block when print is active
- MUST block when calibration is in progress

#### FR3: Manual Extrusion (AD5X, Future 5M)
The API MUST provide a method to manually extrude or retract filament.

**Parameters:**
- Delta: distance in mm (positive = extrude, negative = retract)

**Behavior:**
- MUST heat nozzle automatically if cold
- MUST cool down and disable steppers after operation
- MUST block during print/calibration

#### FR4: Homing Operations (AD5X, Future 5M)
The API MUST provide a method to home all axes.

**Behavior:**
- MUST block during print/calibration
- MUST clear crash recovery state
- MUST use rapid home sequence

#### FR5: Error Code Management (AD5X IFS Only)
The API MUST provide methods to:
- Query active error codes
- Clear specific IFS error codes

**Implementation:**
- Located in MaterialStation module (IFS-specific)
- Full enum coverage of known error codes

### Non-Functional Requirements

#### NFR1: Capability Detection
The API MUST automatically detect command availability based on printer model and firmware features.

#### NFR2: Type Safety
All methods MUST use TypeScript enums for error codes, literal types for axes, and strict parameter validation.

#### NFR3: Error Handling
All methods MUST return boolean success indicators and provide clear error messages for unsupported operations.

#### NFR4: Backward Compatibility
Changes MUST NOT break existing API functionality on 5M/5M Pro printers.

---

## Capability Detection Strategy

### Detection Mechanism

Commands are gated by capability flags in the `/detail` endpoint response. The actual response structure from AD5X:

```typescript
// From /detail response on AD5X
{
  "detail": {
    "name": "AD5X",
    "moveCtrl": 1,           // 1 = available, 0/undefined = not available
    "extrudeCtrl": 1,        // 1 = available, 0/undefined = not available
    "hasMatlStation": true,  // true = available, false/undefined = not available
    ...
  }
}
```

**Detection Logic:**
1. Check if capability field exists in response
2. If field doesn't exist → capability is `false` (feature not supported)
3. If field exists → check value: `1` or `true` = `true`, `0` or `false` = `false`

This ensures:
- 5M printers (today) lack these fields → capabilities are `false`
- 5M printers (future) add `"moveCtrl": 1` → automatically becomes `true`
- No code changes needed when 5M firmware adds features

### Detection Implementation

**File:** `src/api/controls/Capabilities.ts` (NEW)

```typescript
/**
 * Represents the capabilities of a connected printer.
 * Automatically detected from /detail response.
 */
export interface PrinterCapabilities {
    /** Printer model family (for informational purposes only) */
    model: 'AD5X' | '5M' | '5MPro' | 'Unknown';

    /** Manual axis movement control available */
    canMoveAxes: boolean;

    /** Manual extrusion control available */
    canExtrude: boolean;

    /** Has Intelligent Filament Station (IFS) */
    hasMaterialStation: boolean;

    /** Advanced homing control available */
    canAdvancedHome: boolean;
}

/**
 * Extract printer capabilities from /detail response.
 *
 * Uses pure field checking - no model inference for capabilities.
 * This ensures automatic support when 5M firmware adds these features.
 */
export function detectCapabilities(detail: DetailResponse): PrinterCapabilities {
    const d = detail.detail;

    // Pure field checking with proper validation:
    // - Field doesn't exist → false (5M today)
    // - Field exists but is 0/false → false (disabled)
    // - Field exists and is 1/true → true (enabled)
    const canMoveAxes = d.moveCtrl === 1;
    const canExtrude = d.extrudeCtrl === 1;
    const hasMaterialStation = d.hasMatlStation === true;

    // Model detection - ONLY for informational purposes (error messages, logging)
    // NOT used for capability detection
    let model: PrinterCapabilities['model'] = 'Unknown';
    const name = d.name || '';

    if (name.includes('AD5X')) {
        model = 'AD5X';
    } else if (name.includes('Pro')) {
        model = '5MPro';
    } else if (name.includes('5M')) {
        model = '5M';
    }

    return {
        model,  // Just for display/logging
        canMoveAxes,        // Based on moveCtrl field
        canExtrude,         // Based on extrudeCtrl field
        hasMaterialStation, // Based on hasMatlStation field
        canAdvancedHome: canMoveAxes  // Same as moveCtrl
    };
}
```

### Usage in Control Class

```typescript
export class Control {
    private capabilities?: PrinterCapabilities;

    constructor(private client: FiveMClient) {
        // Capabilities loaded on first use
    }

    private async ensureCapabilities(): Promise<PrinterCapabilities> {
        if (!this.capabilities) {
            const detail = await this.client.info.getDetailResponse();
            this.capabilities = detectCapabilities(detail);
        }
        return this.capabilities;
    }

    public async moveAxis(axis: 'x' | 'y' | 'z', delta: number): Promise<boolean> {
        const caps = await this.ensureCapabilities();

        if (!caps.canMoveAxes) {
            throw new NotSupportedError(
                'Manual axis movement is not supported on this printer model. ' +
                `This feature requires AD5X or later firmware. Current model: ${caps.model}`
            );
        }

        // ... proceed with command
    }
}
```

### Capability Cache Invalidation

Capabilities should be cached per session but can be refreshed:

```typescript
export class Control {
    /**
     * Refresh capability detection from printer.
     * Call this after firmware updates or when reconnecting.
     */
    public async refreshCapabilities(): Promise<PrinterCapabilities> {
        this.capabilities = undefined;
        return this.ensureCapabilities();
    }
}
```

---

## Error Code System

### IFS Error Code Enum

**File:** `src/models/IFSErrors.ts` (NEW)

```typescript
/**
 * Intelligent Filament Station (IFS) error codes.
 *
 * These errors occur during multi-material printing operations
 * on AD5X printers with the IFS module.
 */
export enum IFSError {
    /** Channel 1 (slot 1) feeding timeout */
    E0100 = 'E0100',

    /** Channel 2 (slot 2) feeding timeout */
    E0101 = 'E0101',

    /** Channel 3 (slot 3) feeding timeout */
    E0102 = 'E0102',

    /** Channel 4 (slot 4) feeding timeout */
    E0103 = 'E0103',

    /** Channel 1 (slot 1) retracting timeout */
    E0104 = 'E0104',

    /** Channel 2 (slot 2) retracting timeout */
    E0105 = 'E0105',

    /** Channel 3 (slot 3) retracting timeout */
    E0106 = 'E0106',

    /** Channel 4 (slot 4) retracting timeout */
    E0107 = 'E0107',

    /** Failed to feed filament to extruder */
    E0108 = 'E0108',

    /** IFS odometer roller not moving (stall detection) */
    E0109 = 'E0109',

    /** IFS homing error */
    E0114 = 'E0114'
}

/**
 * Get detailed description of an IFS error code.
 */
export function getIFSErrorDescription(errorCode: IFSError): string {
    const descriptions: Record<IFSError, string> = {
        [IFSError.E0100]: 'Slot 1 feeding timeout - filament failed to reach extruder',
        [IFSError.E0101]: 'Slot 2 feeding timeout - filament failed to reach extruder',
        [IFSError.E0102]: 'Slot 3 feeding timeout - filament failed to reach extruder',
        [IFSError.E0103]: 'Slot 4 feeding timeout - filament failed to reach extruder',
        [IFSError.E0104]: 'Slot 1 retracting timeout - filament failed to retract',
        [IFSError.E0105]: 'Slot 2 retracting timeout - filament failed to retract',
        [IFSError.E0106]: 'Slot 3 retracting timeout - filament failed to retract',
        [IFSError.E0107]: 'Slot 4 retracting timeout - filament failed to retract',
        [IFSError.E0108]: 'Failed to feed filament to extruder - check for jams',
        [IFSError.E0109]: 'IFS odometer roller stall detected - motor not moving',
        [IFSError.E0114]: 'IFS homing error - failed to home material station'
    };

    return descriptions[errorCode] || 'Unknown IFS error';
}

/**
 * Get slot number from IFS error code.
 * Returns undefined for non-slot-specific errors.
 */
export function getIFSErrorSlot(errorCode: IFSError): number | undefined {
    const slotMap: Partial<Record<IFSError, number>> = {
        [IFSError.E0100]: 1,
        [IFSError.E0101]: 2,
        [IFSError.E0102]: 3,
        [IFSError.E0103]: 4,
        [IFSError.E0104]: 1,
        [IFSError.E0105]: 2,
        [IFSError.E0106]: 3,
        [IFSError.E0107]: 4
    };

    return slotMap[errorCode];
}

/**
 * Check if error is a feeding timeout.
 */
export function isFeedingTimeout(errorCode: IFSError): boolean {
    return errorCode >= IFSError.E0100 && errorCode <= IFSError.E0103;
}

/**
 * Check if error is a retracting timeout.
 */
export function isRetractingTimeout(errorCode: IFSError): boolean {
    return errorCode >= IFSError.E0104 && errorCode <= IFSError.E0107;
}

/**
 * Check if error is slot-specific (has associated slot number).
 */
export function isSlotSpecificError(errorCode: IFSError): boolean {
    return getIFSErrorSlot(errorCode) !== undefined;
}
```

### Error Categories

For higher-level error handling:

```typescript
/**
 * IFS error categories for structured error handling.
 */
export enum IFSErrorCategory {
    /** Filament feeding errors */
    FeedingTimeout = 'feeding_timeout',

    /** Filament retracting errors */
    RetractingTimeout = 'retracting_timeout',

    /** Mechanical/hardware errors */
    Mechanical = 'mechanical',

    /** Homing/calibration errors */
    Homing = 'homing',

    /** Unknown errors */
    Unknown = 'unknown'
}

/**
 * Get error category for an IFS error code.
 */
export function getIFSErrorCategory(errorCode: IFSError): IFSErrorCategory {
    if (isFeedingTimeout(errorCode)) return IFSErrorCategory.FeedingTimeout;
    if (isRetractingTimeout(errorCode)) return IFSErrorCategory.RetractingTimeout;
    if (errorCode === IFSError.E0109) return IFSErrorCategory.Mechanical;
    if (errorCode === IFSError.E0114) return IFSErrorCategory.Homing;
    return IFSErrorCategory.Unknown;
}
```

---

## Type Definitions

### New Type Definitions

**File:** `src/models/ff-models.ts` (ADDITIONS)

```typescript
// ============================================================================
// PRINTER CONTROL COMMANDS
// ============================================================================

/**
 * Axis identifiers for manual movement commands.
 */
export type MovementAxis = 'x' | 'y' | 'z';

/**
 * Extruder axis identifier.
 */
export type ExtruderAxis = 'e';

/**
 * Movement direction for delta values.
 */
export type MovementDirection = -1 | 1;

// ============================================================================
// COMMAND ARGUMENTS
// ============================================================================

/**
 * Arguments for printer rename command.
 */
export interface ReNameCommandArgs {
    /** New printer name */
    name: string;
}

/**
 * Arguments for manual axis movement command.
 */
export interface MoveCtrlCommandArgs {
    /** Axis to move */
    axis: MovementAxis;

    /** Distance in mm (positive = right/forward/down, negative = left/backward/up) */
    delta: number;
}

/**
 * Arguments for manual extrusion command.
 */
export interface ExtrudeCtrlCommandArgs {
    /** Extruder axis (currently ignored by firmware, always uses E) */
    axis: ExtruderAxis;

    /** Extrusion distance in mm (positive = extrude, negative = retract) */
    delta: number;
}

/**
 * Arguments for homing command.
 */
export interface HomingCtrlCommandArgs {
    // Currently unused - no arguments required
}

/**
 * Arguments for error code control command.
 */
export interface ErrorCodeCtrlCommandArgs {
    /** Action to perform - must be "clearErrorCode" */
    action: 'clearErrorCode';

    /** Error code to clear */
    errorCode: string;
}

// ============================================================================
// CAPABILITIES
// ============================================================================

/**
 * Detected printer capabilities.
 */
export interface PrinterCapabilities {
    /** Printer model family */
    model: 'AD5X' | '5M' | '5MPro' | 'Unknown';

    /** Manual axis movement control available */
    canMoveAxes: boolean;

    /** Manual extrusion control available */
    canExtrude: boolean;

    /** Has Intelligent Filament Station (IFS) */
    hasMaterialStation: boolean;

    /** Advanced homing control available */
    canAdvancedHome: boolean;
}

// ============================================================================
// ERRORS
// ============================================================================

/**
 * Error thrown when attempting an unsupported operation.
 */
export class NotSupportedError extends Error {
    constructor(message: string) {
        super(`[NotSupported] ${message}`);
        this.name = 'NotSupportedError';
    }
}

/**
 * Error thrown when printer is in wrong state for operation.
 */
export class InvalidStateError extends Error {
    constructor(message: string) {
        super(`[InvalidState] ${message}`);
        this.name = 'InvalidStateError';
    }
}
```

---

## API Design

### Public API - Control Class Extensions

**File:** `src/api/controls/Control.ts`

```typescript
export class Control {
    // ... existing methods ...

    // =========================================================================
    // PRINTER MANAGEMENT
    // =========================================================================

    /**
     * Rename the printer.
     *
     * This method works on all printer models (5M, 5M Pro, AD5X).
     *
     * @param name New printer name
     * @returns Promise<boolean> True if successful
     *
     * @example
     * ```typescript
     * await client.control.renamePrinter("My Awesome Printer");
     * ```
     */
    public async renamePrinter(name: string): Promise<boolean>;

    // =========================================================================
    // MANUAL MOVEMENT (AD5X, Future 5M)
    // =========================================================================

    /**
     * Manually move a specific axis.
     *
     * **AD5X Only (5M support planned for future firmware)**
     *
     * The printer must not be busy, printing, or calibrating for this operation.
     *
     * @param axis Axis to move ("x", "y", or "z")
     * @param delta Distance in mm
     *   - X: positive = right, negative = left
     *   - Y: positive = forward, negative = backward
     *   - Z: positive = bed down, negative = bed up (inverted)
     * @returns Promise<boolean> True if movement initiated successfully
     * @throws NotSupportedError if printer model doesn't support this feature
     * @throws InvalidStateError if printer is busy, printing, or calibrating
     *
     * @example
     * ```typescript
     * // Move X axis 10mm to the right
     * await client.control.moveAxis("x", 10.0);
     *
     * // Move Y axis 5mm backward
     * await client.control.moveAxis("y", -5.0);
     *
     * // Move Z axis (bed) down 2mm
     * await client.control.moveAxis("z", 2.0);
     * ```
     */
    public async moveAxis(axis: MovementAxis, delta: number): Promise<boolean>;

    /**
     * Manually extrude or retract filament.
     *
     * **AD5X Only (5M support planned for future firmware)**
     *
     * This command will automatically heat the nozzle if cold, perform the
     * extrusion/retraction, then cool down and disable steppers.
     *
     * The printer must not be busy, printing, or calibrating for this operation.
     *
     * @param delta Extrusion distance in mm
     *   - Positive: extrude filament
     *   - Negative: retract filament
     * @returns Promise<boolean> True if operation initiated successfully
     * @throws NotSupportedError if printer model doesn't support this feature
     * @throws InvalidStateError if printer is busy, printing, or calibrating
     *
     * @example
     * ```typescript
     * // Extrude 5mm of filament
     * await client.control.extrude(5.0);
     *
     * // Retract 3mm of filament
     * await client.control.extrude(-3.0);
     * ```
     */
    public async extrude(delta: number): Promise<boolean>;

    // =========================================================================
    // HOMING OPERATIONS (AD5X, Future 5M)
    // =========================================================================

    /**
     * Home all axes.
     *
     * **AD5X Only (5M support planned for future firmware)**
     *
     * This performs a rapid home sequence for all axes and clears crash
     * recovery state.
     *
     * The printer must not be busy, printing, or calibrating for this operation.
     *
     * @returns Promise<boolean> True if homing initiated successfully
     * @throws NotSupportedError if printer model doesn't support this feature
     * @throws InvalidStateError if printer is busy, printing, or calibrating
     *
     * @example
     * ```typescript
     * await client.control.homeAllAxes();
     * ```
     */
    public async homeAllAxes(): Promise<boolean>;
}
```

### Public API - MaterialStation Extensions

**File:** `src/api/materials/MaterialStation.ts`

```typescript
export class MaterialStation {
    // ... existing methods ...

    // =========================================================================
    // ERROR MANAGEMENT (AD5X IFS Only)
    // =========================================================================

    /**
     * Clear an IFS error code.
     *
     * **AD5X Only - IFS-specific feature**
     *
     * Clears the specified error code if it matches the currently active error.
     * Only errors that match the active error can be cleared.
     *
     * @param errorCode Error code to clear (use IFSError enum)
     * @returns Promise<boolean> True if error cleared successfully
     * @throws NotSupportedError if printer doesn't have IFS
     *
     * @example
     * ```typescript
     * import { IFSError } from '@ghosttypes/ff-api/models';
     *
     * // Clear stall detection error
     * await client.materialStation.clearError(IFSError.E0109);
     *
     * // Clear slot 1 feeding timeout
     * await client.materialStation.clearError(IFSError.E0100);
     * ```
     */
    public async clearError(errorCode: IFSError): Promise<boolean>;

    /**
     * Get detailed information about the current active error.
     *
     * **AD5X Only - IFS-specific feature**
     *
     * @returns Promise<IFSLErrorInfo | null> Error info or null if no error
     *
     * @example
     * ```typescript
     * const error = await client.materialStation.getActiveError();
     * if (error) {
     *     console.log(`Error: ${error.code}`);
     *     console.log(`Description: ${error.description}`);
     *     console.log(`Slot: ${error.slot ?? 'N/A'}`);
     *     console.log(`Category: ${error.category}`);
     * }
     * ```
     */
    public async getActiveError(): Promise<IFSLErrorInfo | null>;
}
```

### Supporting Types

```typescript
/**
 * Detailed IFS error information.
 */
export interface IFSLErrorInfo {
    /** Error code (e.g., "E0109") */
    code: IFSError;

    /** Human-readable description */
    description: string;

    /** Error category */
    category: IFSErrorCategory;

    /** Affected slot (1-4), or undefined if not slot-specific */
    slot?: number;

    /** Whether error is a feeding timeout */
    isFeedingTimeout: boolean;

    /** Whether error is a retracting timeout */
    isRetractingTimeout: boolean;
}
```

---

## Implementation Details

### 1. Capability Detection Module

**File:** `src/api/controls/Capabilities.ts` (NEW)

```typescript
import { DetailResponse } from '../../models/ff-models';

/**
 * Represents the capabilities of a connected printer.
 */
export interface PrinterCapabilities {
    model: 'AD5X' | '5M' | '5MPro' | 'Unknown';
    canMoveAxes: boolean;
    canExtrude: boolean;
    hasMaterialStation: boolean;
    canAdvancedHome: boolean;
}

/**
 * Extract printer capabilities from /detail response.
 *
 * Uses pure field checking - no model inference for capabilities.
 * This ensures automatic support when 5M firmware adds these features.
 */
export function detectCapabilities(detail: DetailResponse): PrinterCapabilities {
    const d = detail.detail;

    // Pure field checking with proper validation:
    // - Field doesn't exist → false (5M today)
    // - Field exists but is 0/false → false (disabled)
    // - Field exists and is 1/true → true (enabled)
    const canMoveAxes = d.moveCtrl === 1;
    const canExtrude = d.extrudeCtrl === 1;
    const hasMaterialStation = d.hasMatlStation === true;

    // Model detection - ONLY for informational purposes (error messages, logging)
    // NOT used for capability detection
    let model: PrinterCapabilities['model'] = 'Unknown';
    const name = d.name || '';

    if (name.includes('AD5X')) {
        model = 'AD5X';
    } else if (name.includes('Pro')) {
        model = '5MPro';
    } else if (name.includes('5M')) {
        model = '5M';
    }

    return {
        model,  // Just for display/logging
        canMoveAxes,        // Based on moveCtrl field
        canExtrude,         // Based on extrudeCtrl field
        hasMaterialStation, // Based on hasMatlStation field
        canAdvancedHome: canMoveAxes  // Same as moveCtrl
    };
}

/**
 * Check if printer model supports a feature.
 */
export function supportsFeature(
    capabilities: PrinterCapabilities,
    feature: keyof Omit<PrinterCapabilities, 'model'>
): boolean {
    return capabilities[feature] === true;
}
```

### 2. Control Class Extensions

**File:** `src/api/controls/Control.ts`

**Add to imports:**
```typescript
import {
    ReNameCommandArgs,
    MoveCtrlCommandArgs,
    ExtrudeCtrlCommandArgs,
    HomingCtrlCommandArgs,
    MovementAxis,
    NotSupportedError,
    InvalidStateError
} from '../../models/ff-models';
import {
    detectCapabilities,
    PrinterCapabilities,
    supportsFeature
} from './Capabilities';
import { MachineState } from '../../models/ff-models';
```

**Add to class properties:**
```typescript
export class Control {
    private capabilities?: PrinterCapabilities;

    // ... existing code ...
}
```

**Add helper methods:**
```typescript
/**
 * Ensure capabilities are loaded.
 * @private
 */
private async ensureCapabilities(): Promise<PrinterCapabilities> {
    if (!this.capabilities) {
        const detail = await this.client.info.getDetailResponse();
        this.capabilities = detectCapabilities(detail);
    }
    return this.capabilities;
}

/**
 * Check if printer is in a valid state for manual operations.
 * @private
 */
private async validateReadyState(): Promise<void> {
    const detail = await this.client.info.getDetailResponse();
    const state = detail.machineInfo.machineState;

    // Block if printing
    if (state === MachineState.Printing) {
        throw new InvalidStateError(
            'Cannot perform manual operation while printing'
        );
    }

    // Block if calibrating
    if (state === MachineState.Calibrating) {
        throw new InvalidStateError(
            'Cannot perform manual operation while calibrating'
        );
    }

    // Block if busy
    if (state === MachineState.Busy) {
        throw new InvalidStateError(
            'Cannot perform manual operation while printer is busy'
        );
    }
}
```

**Implementation: renamePrinter**
```typescript
/**
 * Rename the printer.
 * Works on all printer models.
 */
public async renamePrinter(name: string): Promise<boolean> {
    // Validate input
    if (!name || name.trim() === '') {
        throw new Error('Printer name cannot be empty');
    }

    const args: ReNameCommandArgs = {
        name: name.trim()
    };

    const response = await this.sendControlCommand(
        Commands.ReNameCmd,
        args
    );

    const parsed = JSON.parse(response) as GenericResponse;
    const success = NetworkUtils.isOk(parsed.code);

    // Invalidate capability cache on name change
    if (success) {
        this.capabilities = undefined;
    }

    return success;
}
```

**Implementation: moveAxis**
```typescript
/**
 * Manually move a specific axis.
 * AD5X only (5M support planned for future firmware).
 */
public async moveAxis(axis: MovementAxis, delta: number): Promise<boolean> {
    // Check capabilities
    const caps = await this.ensureCapabilities();

    if (!supportsFeature(caps, 'canMoveAxes')) {
        throw new NotSupportedError(
            `Manual axis movement is not supported on ${caps.model}. ` +
            'This feature requires AD5X or later firmware.'
        );
    }

    // Validate state
    await this.validateReadyState();

    // Validate delta
    if (delta === 0) {
        throw new Error('Delta cannot be zero');
    }

    const args: MoveCtrlCommandArgs = {
        axis,
        delta
    };

    const response = await this.sendControlCommand(
        Commands.MoveCtrlCmd,
        args
    );

    const parsed = JSON.parse(response) as GenericResponse;
    return NetworkUtils.isOk(parsed.code);
}
```

**Implementation: extrude**
```typescript
/**
 * Manually extrude or retract filament.
 * AD5X only (5M support planned for future firmware).
 */
public async extrude(delta: number): Promise<boolean> {
    // Check capabilities
    const caps = await this.ensureCapabilities();

    if (!supportsFeature(caps, 'canExtrude')) {
        throw new NotSupportedError(
            `Manual extrusion is not supported on ${caps.model}. ` +
            'This feature requires AD5X or later firmware.'
        );
    }

    // Validate state
    await this.validateReadyState();

    // Validate delta
    if (delta === 0) {
        throw new Error('Delta cannot be zero');
    }

    const args: ExtrudeCtrlCommandArgs = {
        axis: 'e',
        delta
    };

    const response = await this.sendControlCommand(
        Commands.ExtrudeCtrlCmd,
        args
    );

    const parsed = JSON.parse(response) as GenericResponse;
    return NetworkUtils.isOk(parsed.code);
}
```

**Implementation: homeAllAxes**
```typescript
/**
 * Home all axes.
 * AD5X only (5M support planned for future firmware).
 */
public async homeAllAxes(): Promise<boolean> {
    // Check capabilities
    const caps = await this.ensureCapabilities();

    if (!supportsFeature(caps, 'canAdvancedHome')) {
        throw new NotSupportedError(
            `Advanced homing is not supported on ${caps.model}. ` +
            'This feature requires AD5X or later firmware. ' +
            'Consider using client.move.homeAxes() via TCP instead.'
        );
    }

    // Validate state
    await this.validateReadyState();

    const args: HomingCtrlCommandArgs = {};

    const response = await this.sendControlCommand(
        Commands.HomingCtrlCmd,
        args
    );

    const parsed = JSON.parse(response) as GenericResponse;
    return NetworkUtils.isOk(parsed.code);
}
```

**Add capability refresh:**
```typescript
/**
 * Refresh capability detection from printer.
 * Call this after firmware updates or when reconnecting.
 */
public async refreshCapabilities(): Promise<PrinterCapabilities> {
    this.capabilities = undefined;
    return this.ensureCapabilities();
}
```

### 3. Command Constants

**File:** `src/api/Commands.ts`

**Add to Commands class:**
```typescript
export class Commands {
    // ... existing commands ...

    /** Command for renaming the printer */
    static readonly ReNameCmd = "reName_cmd";

    /** Command for manual axis movement */
    static readonly MoveCtrlCmd = "moveCtrl_cmd";

    /** Command for manual extrusion */
    static readonly ExtrudeCtrlCmd = "extrudeCtrl_cmd";

    /** Command for homing all axes */
    static readonly HomingCtrlCmd = "homingCtrl_cmd";

    /** Command for error code control */
    static readonly ErrorCodeCtrlCmd = "errorCodeCtrl_cmd";
}
```

### 4. MaterialStation Error Management

**File:** `src/api/materials/MaterialStation.ts`

**Add to imports:**
```typescript
import {
    IFSError,
    getIFSErrorDescription,
    getIFSErrorSlot,
    getIFSErrorCategory,
    isFeedingTimeout,
    isRetractingTimeout,
    IFSLErrorInfo,
    ErrorCodeCtrlCommandArgs
} from '../../models/IFSErrors';
import { NotSupportedError } from '../../models/ff-models';
```

**Implementation: clearError**
```typescript
/**
 * Clear an IFS error code.
 * AD5X only - IFS-specific feature.
 */
public async clearError(errorCode: IFSError): Promise<boolean> {
    // Check for IFS support
    const status = await this.getStatus();

    if (!status.slotCnt || status.slotCnt === 0) {
        throw new NotSupportedError(
            'IFS error management is only available on AD5X printers with IFS hardware'
        );
    }

    const args: ErrorCodeCtrlCommandArgs = {
        action: 'clearErrorCode',
        errorCode
    };

    const response = await this.client.control.sendControlCommand(
        Commands.ErrorCodeCtrlCmd,
        args
    );

    const parsed = JSON.parse(response) as GenericResponse;
    return NetworkUtils.isOk(parsed.code);
}
```

**Implementation: getActiveError**
```typescript
/**
 * Get detailed information about the current active error.
 * AD5X only - IFS-specific feature.
 */
public async getActiveError(): Promise<IFSLErrorInfo | null> {
    // Get printer status
    const detail = await this.client.info.getDetailResponse();

    // Check for error code
    const errorCode = detail.machineInfo.ErrorCode;

    if (!errorCode || errorCode === '' || errorCode === '0' || errorCode === 'E0') {
        return null;
    }

    // Check if it's an IFS error
    const ifsError = Object.values(IFSError).find(e => e === errorCode);

    if (!ifsError) {
        // Not an IFS error
        return null;
    }

    // Build error info
    return {
        code: ifsError,
        description: getIFSErrorDescription(ifsError),
        category: getIFSErrorCategory(ifsError),
        slot: getIFSErrorSlot(ifsError),
        isFeedingTimeout: isFeedingTimeout(ifsError),
        isRetractingTimeout: isRetractingTimeout(ifsError)
    };
}
```

---

## Error Handling

### Error Class Hierarchy

```
Error
├── NotSupportedError         (operation not available on this printer)
└── InvalidStateError         (printer in wrong state for operation)
```

### Error Response Handling

All commands return boolean success indicators:

```typescript
const success = await client.control.moveAxis('x', 10.0);

if (!success) {
    // Operation failed - check printer state for details
    const detail = await client.info.getDetailResponse();
    console.error('Move failed:', detail.machineInfo.machineState);
}
```

### Capability Errors

Thrown when attempting unsupported operations:

```typescript
try {
    await client.control.extrude(5.0);
} catch (error) {
    if (error instanceof NotSupportedError) {
        console.error('This feature is not available:', error.message);
        // Fallback to TCP G-code for 5M printers
        await client.tcp.sendGCode('G1 E5 F300');
    }
}
```

### State Validation Errors

Thrown when printer is in wrong state:

```typescript
try {
    await client.control.moveAxis('x', 10.0);
} catch (error) {
    if (error instanceof InvalidStateError) {
        console.error('Cannot move now:', error.message);
        // Wait for printer to be ready
        await waitForReady();
    }
}
```

---

## Testing Strategy

### Unit Tests

**File:** `src/api/controls/__tests__/Control.ad5x.test.ts`

```typescript
import { Control } from '../Control';
import { FiveMClient } from '../../FiveMClient';
import { Commands } from '../../Commands';
import { IFSError } from '../../../models/IFSErrors';
import { MachineState } from '../../../models/ff-models';

describe('Control - AD5X Commands', () => {
    let client: FiveMClient;
    let control: Control;

    beforeEach(() => {
        client = new FiveMClient('192.168.1.100', 'SNAD5X12345', '1234');
        control = client.control;
    });

    describe('renamePrinter', () => {
        it('should rename printer successfully', async () => {
            const mockResponse = JSON.stringify({ code: 0, message: 'ok' });
            jest.spyOn(control, 'sendControlCommand').mockResolvedValue(mockResponse);

            const result = await control.renamePrinter('New Printer Name');

            expect(result).toBe(true);
            expect(control.sendControlCommand).toHaveBeenCalledWith(
                Commands.ReNameCmd,
                { name: 'New Printer Name' }
            );
        });

        it('should reject empty name', async () => {
            await expect(control.renamePrinter(''))
                .rejects.toThrow('Printer name cannot be empty');
        });
    });

    describe('moveAxis', () => {
        beforeEach(() => {
            // Mock AD5X capabilities
            jest.spyOn(client.info, 'getDetailResponse').mockResolvedValue({
                machineInfo: {
                    printerType: 'AD5X',
                    machineState: MachineState.Ready,
                    matlStationInfo: { slotCnt: 4 }
                }
            } as any);
        });

        it('should move X axis successfully', async () => {
            const mockResponse = JSON.stringify({ code: 0, message: 'ok' });
            jest.spyOn(control, 'sendControlCommand').mockResolvedValue(mockResponse);

            const result = await control.moveAxis('x', 10.0);

            expect(result).toBe(true);
            expect(control.sendControlCommand).toHaveBeenCalledWith(
                Commands.MoveCtrlCmd,
                { axis: 'x', delta: 10.0 }
            );
        });

        it('should reject on 5M printer', async () => {
            // Mock 5M capabilities
            jest.spyOn(client.info, 'getDetailResponse').mockResolvedValue({
                machineInfo: {
                    printerType: 'Adventurer 5M',
                    machineState: MachineState.Ready
                }
            } as any);

            await expect(control.moveAxis('x', 10.0))
                .rejects.toThrow('NotSupported');
        });

        it('should reject when printing', async () => {
            jest.spyOn(client.info, 'getDetailResponse').mockResolvedValue({
                machineInfo: {
                    printerType: 'AD5X',
                    machineState: MachineState.Printing
                }
            } as any);

            await expect(control.moveAxis('x', 10.0))
                .rejects.toThrow('InvalidState');
        });

        it('should reject zero delta', async () => {
            await expect(control.moveAxis('x', 0))
                .rejects.toThrow('Delta cannot be zero');
        });
    });

    describe('extrude', () => {
        it('should extrude filament successfully', async () => {
            const mockResponse = JSON.stringify({ code: 0, message: 'ok' });
            jest.spyOn(control, 'sendControlCommand').mockResolvedValue(mockResponse);
            jest.spyOn(client.info, 'getDetailResponse').mockResolvedValue({
                machineInfo: {
                    printerType: 'AD5X',
                    machineState: MachineState.Ready
                }
            } as any);

            const result = await control.extrude(5.0);

            expect(result).toBe(true);
            expect(control.sendControlCommand).toHaveBeenCalledWith(
                Commands.ExtrudeCtrlCmd,
                { axis: 'e', delta: 5.0 }
            );
        });

        it('should retract filament successfully', async () => {
            const mockResponse = JSON.stringify({ code: 0, message: 'ok' });
            jest.spyOn(control, 'sendControlCommand').mockResolvedValue(mockResponse);
            jest.spyOn(client.info, 'getDetailResponse').mockResolvedValue({
                machineInfo: {
                    printerType: 'AD5X',
                    machineState: MachineState.Ready
                }
            } as any);

            const result = await control.extrude(-3.0);

            expect(result).toBe(true);
            expect(control.sendControlCommand).toHaveBeenCalledWith(
                Commands.ExtrudeCtrlCmd,
                { axis: 'e', delta: -3.0 }
            );
        });
    });

    describe('homeAllAxes', () => {
        it('should home all axes successfully', async () => {
            const mockResponse = JSON.stringify({ code: 0, message: 'ok' });
            jest.spyOn(control, 'sendControlCommand').mockResolvedValue(mockResponse);
            jest.spyOn(client.info, 'getDetailResponse').mockResolvedValue({
                machineInfo: {
                    printerType: 'AD5X',
                    machineState: MachineState.Ready
                }
            } as any);

            const result = await control.homeAllAxes();

            expect(result).toBe(true);
            expect(control.sendControlCommand).toHaveBeenCalledWith(
                Commands.HomingCtrlCmd,
                {}
            );
        });
    });
});
```

### MaterialStation Error Tests

**File:** `src/api/materials/__tests__/MaterialStation.errors.test.ts`

```typescript
describe('MaterialStation - Error Management', () => {
    let client: FiveMClient;
    let materialStation: MaterialStation;

    beforeEach(() => {
        client = new FiveMClient('192.168.1.100', 'SNAD5X12345', '1234');
        materialStation = client.materialStation;
    });

    describe('clearError', () => {
        it('should clear E0109 error', async () => {
            const mockResponse = JSON.stringify({ code: 0, message: 'ok' });
            jest.spyOn(client.control, 'sendControlCommand').mockResolvedValue(mockResponse);
            jest.spyOn(materialStation, 'getStatus').mockResolvedValue({
                slotCnt: 4,
                slotInfos: []
            } as any);

            const result = await materialStation.clearError(IFSError.E0109);

            expect(result).toBe(true);
            expect(client.control.sendControlCommand).toHaveBeenCalledWith(
                Commands.ErrorCodeCtrlCmd,
                {
                    action: 'clearErrorCode',
                    errorCode: 'E0109'
                }
            );
        });

        it('should reject on non-AD5X printer', async () => {
            jest.spyOn(materialStation, 'getStatus').mockResolvedValue({
                slotCnt: 0,
                slotInfos: []
            } as any);

            await expect(materialStation.clearError(IFSError.E0109))
                .rejects.toThrow('NotSupported');
        });
    });

    describe('getActiveError', () => {
        it('should return null when no error', async () => {
            jest.spyOn(client.info, 'getDetailResponse').mockResolvedValue({
                machineInfo: {
                    ErrorCode: ''
                }
            } as any);

            const error = await materialStation.getActiveError();

            expect(error).toBeNull();
        });

        it('should return error info for E0109', async () => {
            jest.spyOn(client.info, 'getDetailResponse').mockResolvedValue({
                machineInfo: {
                    ErrorCode: 'E0109'
                }
            } as any);

            const error = await materialStation.getActiveError();

            expect(error).not.toBeNull();
            expect(error?.code).toBe(IFSError.E0109);
            expect(error?.description).toContain('stall');
            expect(error?.category).toBe('mechanical');
            expect(error?.slot).toBeUndefined();
        });

        it('should return error info for E0100 with slot', async () => {
            jest.spyOn(client.info, 'getDetailResponse').mockResolvedValue({
                machineInfo: {
                    ErrorCode: 'E0100'
                }
            } as any);

            const error = await materialStation.getActiveError();

            expect(error?.slot).toBe(1);
            expect(error?.isFeedingTimeout).toBe(true);
        });
    });
});
```

### Integration Tests

**File:** `src/api/controls/__tests__/Control.ad5x.integration.test.ts`

```typescript
describe('Control - AD5X Integration Tests', () => {
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

    it('should detect AD5X capabilities', async () => {
        const caps = await client.control.refreshCapabilities();

        expect(caps.model).toBe('AD5X');
        expect(caps.canMoveAxes).toBe(true);
        expect(caps.canExtrude).toBe(true);
        expect(caps.hasMaterialStation).toBe(true);
    });

    it('should rename printer', async () => {
        const originalName = 'Test Printer';
        const newName = 'Renamed Printer';

        await client.control.renamePrinter(newName);

        // Verify name changed
        const detail = await client.info.getDetailResponse();
        expect(detail.machineInfo.printerName).toBe(newName);

        // Restore original name
        await client.control.renamePrinter(originalName);
    });
});
```

---

## Usage Examples

### Example 1: Basic Printer Renaming

```typescript
import { FiveMClient } from '@ghosttypes/ff-api';

const client = new FiveMClient(
    '192.168.1.100',
    'SNADVA5M00000',
    '12345'
);

// Rename printer (works on all models)
await client.control.renamePrinter('My Workshop Printer');

console.log('Printer renamed successfully');
```

### Example 2: Manual Bed Leveling Setup

```typescript
import { FiveMClient } from '@ghosttypes/ff-api';
import { MachineState } from '@ghosttypes/ff-api/models';

async function manualBedLeveling() {
    // Wait for printer to be ready
    let state = (await client.info.getDetailResponse()).machineInfo.machineState;
    while (state !== MachineState.Ready) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        state = (await client.info.getDetailResponse()).machineInfo.machineState;
    }

    // Home all axes first
    console.log('Homing axes...');
    await client.control.homeAllAxes();
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for home to complete

    // Move nozzle to first corner
    console.log('Moving to front-left corner...');
    await client.control.moveAxis('x', -20);  // Move left
    await client.control.moveAxis('y', -20);  // Move forward
    await client.control.moveAxis('z', 2);    // Lower nozzle

    // Manual extrusion to test filament flow
    console.log('Testing extrusion...');
    await client.control.extrude(10);  // Extrude 10mm

    console.log('Bed leveling setup complete!');
}
```

### Example 3: Cross-Model Compatibility

```typescript
import { FiveMClient } from '@ghosttypes/ff-api';
import { NotSupportedError } from '@ghosttypes/ff-api/models';

async function smartHomeOperation() {
    try {
        // Try AD5X-style homing first
        await client.control.homeAllAxes();
        console.log('Used AD5X advanced homing');
    } catch (error) {
        if (error instanceof NotSupportedError) {
            // Fallback to TCP G-code for 5M printers
            console.log('AD5X homing not available, using TCP fallback');
            await client.tcp.sendGCode('G28');
        } else {
            throw error;
        }
    }
}
```

### Example 4: IFS Error Recovery

```typescript
import { FiveMClient } from '@ghosttypes/ff-api';
import { IFSError } from '@ghosttypes/ff-api/models';

async function handleIFSError() {
    // Check for active error
    const error = await client.materialStation.getActiveError();

    if (!error) {
        console.log('No active error');
        return;
    }

    console.log(`Error detected: ${error.code}`);
    console.log(`Description: ${error.description}`);
    console.log(`Category: ${error.category}`);

    if (error.slot) {
        console.log(`Affected slot: ${error.slot}`);

        // Slot-specific recovery
        if (error.isFeedingTimeout) {
            console.log('Feeding timeout - checking filament path...');
            // Check for jams, verify filament is loaded, etc.
        } else if (error.isRetractingTimeout) {
            console.log('Retracting timeout - checking retraction mechanism...');
            // Check retraction mechanism
        }
    }

    if (error.category === 'mechanical') {
        console.log('Mechanical error - may require manual intervention');
        // Alert user, disable automatic recovery, etc.
    }

    // Attempt to clear error
    console.log('Attempting to clear error...');
    const cleared = await client.materialStation.clearError(error.code);

    if (cleared) {
        console.log('Error cleared successfully');
    } else {
        console.log('Failed to clear error - may need manual intervention');
    }
}
```

### Example 5: Automated Print Completion Workflow

```typescript
import { FiveMClient } from '@ghosttypes/ff-api';
import { MachineState } from '@ghosttypes/ff-api/models';

async function printCompletionWorkflow() {
    // Monitor print job
    let state = MachineState.Printing;
    while (state === MachineState.Printing) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        state = (await client.info.getDetailResponse()).machineInfo.machineState;
    }

    console.log('Print completed!');

    // Wait for completion state
    while (state !== MachineState.Completed && state !== MachineState.Ready) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        state = (await client.info.getDetailResponse()).machineInfo.machineState;
    }

    // Home axes for next print
    await client.control.homeAllAxes();

    console.log('Printer ready for next job!');
}
```

### Example 6: Capability-Aware Operations

```typescript
import { FiveMClient } from '@ghosttypes/ff-api';

async function performMaintenance() {
    // Check capabilities
    const caps = await client.control.refreshCapabilities();

    console.log(`Printer model: ${caps.model}`);
    console.log(`Manual movement: ${caps.canMoveAxes}`);
    console.log(`Manual extrusion: ${caps.canExtrude}`);
    console.log(`Material station: ${caps.hasMaterialStation}`);

    // Perform model-specific operations
    if (caps.canMoveAxes) {
        console.log('Performing precision axis alignment...');

        // Home first
        await client.control.homeAllAxes();

        // Move to specific position for maintenance
        await client.control.moveAxis('x', 50);
        await client.control.moveAxis('y', 50);
        await client.control.moveAxis('z', 10);

        console.log('Positioned for maintenance');
    }

    if (caps.canExtrude) {
        console.log('Testing extrusion...');

        // Heat and extrude
        await client.control.extrude(20);
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('Extrusion test complete');
    }

    if (caps.hasMaterialStation) {
        console.log('Checking material station status...');

        const status = await client.materialStation.getStatus();

        status.slotInfos.forEach(slot => {
            if (slot.hasFilament) {
                console.log(`Slot ${slot.slotId}: ${slot.materialName} ${slot.materialColor}`);
            }
        });
    }

    console.log('Maintenance complete!');
}
```

---

## Future Enhancements

### Potential Future Features

These features are **not in scope** for this implementation but may be considered for future releases:

#### 1. Position Query

Add methods to query current nozzle position:

```typescript
interface Position {
    x: number;
    y: number;
    z: number;
    e: number;
}

async getPosition(): Promise<Position>;
```

#### 2. Movement Queuing

Queue multiple movements for smooth execution:

```typescript
interface Movement {
    axis: MovementAxis;
    delta: number;
}

async queueMovements(movements: Movement[]): Promise<boolean>;
async executeQueue(): Promise<boolean>;
async clearQueue(): void;
```

#### 3. Speed Control

Control movement speed for manual operations:

```typescript
async moveAxis(
    axis: MovementAxis,
    delta: number,
    speed?: number // mm/min
): Promise<boolean>;
```

#### 4. TCP Fallback for 5M

Automatic fallback to TCP G-code when HTTP commands unavailable:

```typescript
async moveAxis(axis: MovementAxis, delta: number): Promise<boolean> {
    try {
        // Try HTTP command first
        return await this.moveAxisHTTP(axis, delta);
    } catch (error) {
        if (error instanceof NotSupportedError) {
            // Fallback to TCP G-code
            return await this.moveAxisTCP(axis, delta);
        }
        throw error;
    }
}
```

#### 5. Advanced Error Recovery

Automated recovery sequences for specific errors:

```typescript
async recoverFromError(errorCode: IFSError): Promise<boolean> {
    const recovery = getRecoverySequence(errorCode);
    // Execute automated recovery steps
}
```

#### 6. Real-Time Monitoring

WebSocket or long-polling for position/status updates:

```typescript
onPositionChange(callback: (pos: Position) => void): void;
onStateChange(callback: (state: MachineState) => void): void;
```

---

## Appendix

### A. Command Reference

#### reName_cmd

Rename the printer.

**Endpoint:** `POST /control`

**Availability:** All models (5M, 5M Pro, AD5X)

**Request:**
```json
{
    "serialNumber": "SNADVA5M00000",
    "checkCode": "12345",
    "payload": {
        "cmd": "reName_cmd",
        "args": {
            "name": "My Printer Name"
        }
    }
}
```

**Response:**
```json
{
    "code": 0,
    "message": "success"
}
```

#### moveCtrl_cmd

Manually move a specific axis.

**Endpoint:** `POST /control`

**Availability:** AD5X only (future 5M)

**Request:**
```json
{
    "serialNumber": "SNADVA5X00000",
    "checkCode": "12345",
    "payload": {
        "cmd": "moveCtrl_cmd",
        "args": {
            "axis": "x",
            "delta": 10.0
        }
    }
}
```

**Response:**
```json
{
    "code": 0,
    "message": "success"
}
```

**Behavior:**
- Blocks if printing, calibrating, or busy
- Opens Settings UI and triggers appropriate movement handlers
- Z-axis is inverted: positive delta moves bed DOWN

#### extrudeCtrl_cmd

Manually extrude or retract filament.

**Endpoint:** `POST /control`

**Availability:** AD5X only (future 5M)

**Request:**
```json
{
    "serialNumber": "SNADVA5X00000",
    "checkCode": "12345",
    "payload": {
        "cmd": "extrudeCtrl_cmd",
        "args": {
            "axis": "e",
            "delta": 5.0
        }
    }
}
```

**Response:**
```json
{
    "code": 0,
    "message": "success"
}
```

**Behavior:**
- Blocks if printing, calibrating, or busy
- Automatically heats nozzle if cold
- Cools nozzle and disables steppers after operation
- Sends G-code: `G92 E0`, `G1 E<delta> F300`, `M400`

#### homingCtrl_cmd

Home all axes.

**Endpoint:** `POST /control`

**Availability:** AD5X only (future 5M)

**Request:**
```json
{
    "serialNumber": "SNADVA5X00000",
    "checkCode": "12345",
    "payload": {
        "cmd": "homingCtrl_cmd",
        "args": {}
    }
}
```

**Response:**
```json
{
    "code": 0,
    "message": "success"
}
```

**Behavior:**
- Blocks if printing or calibrating
- Sends `G28` to Klipper
- Clears crash recovery state
- Shows "homing" wait dialog

#### errorCodeCtrl_cmd

Clear an IFS error code.

**Endpoint:** `POST /control`

**Availability:** AD5X only (IFS-specific)

**Request:**
```json
{
    "serialNumber": "SNADVA5X00000",
    "checkCode": "12345",
    "payload": {
        "cmd": "errorCodeCtrl_cmd",
        "args": {
            "action": "clearErrorCode",
            "errorCode": "E0109"
        }
    }
}
```

**Response:**
```json
{
    "code": 0,
    "message": "success"
}
```

**Behavior:**
- Only clears error if it matches currently active error
- Silently fails if error code doesn't match

### B. IFS Error Code Reference

| Code | Description | Slot | Category |
|------|-------------|------|----------|
| E0100 | Slot 1 feeding timeout | 1 | feeding_timeout |
| E0101 | Slot 2 feeding timeout | 2 | feeding_timeout |
| E0102 | Slot 3 feeding timeout | 3 | feeding_timeout |
| E0103 | Slot 4 feeding timeout | 4 | feeding_timeout |
| E0104 | Slot 1 retracting timeout | 1 | retracting_timeout |
| E0105 | Slot 2 retracting timeout | 2 | retracting_timeout |
| E0106 | Slot 3 retracting timeout | 3 | retracting_timeout |
| E0107 | Slot 4 retracting timeout | 4 | retracting_timeout |
| E0108 | Failed to feed filament to extruder | - | mechanical |
| E0109 | IFS odometer roller stall | - | mechanical |
| E0114 | IFS homing error | - | homing |

### C. Capability Detection Matrix

| Feature | Detection Method | AD5X | 5M | 5M Pro |
|---------|-----------------|------|----|----|
| renamePrinter | Always available | ✅ | ✅ | ✅ |
| moveAxis | `moveCtrl === 1` in /detail | ✅ | ❌ | ❌ |
| extrude | `extrudeCtrl === 1` in /detail | ✅ | ❌ | ❌ |
| homeAllAxes | `moveCtrl === 1` in /detail | ✅ | ❌ | ❌ |
| clearError | `hasMatlStation === true` in /detail | ✅ | ❌ | ❌ |

**Note:** When 5M firmware adds `moveCtrl: 1` and `extrudeCtrl: 1` to `/detail` response, these features will automatically work without code changes.

### D. Related Documentation

- **Material Station Spec:** `docs/specs/material-station-implementation.md`
- **HTTP API Reference:** `docs/http-api.md`
- **AD5X API Documentation:** `repos/flashforge-api-docs/ad5x-api.md`
- **Firmware Documentation:** `docs/ad5x/`

### E. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-02-07 | Claude Code | Initial specification |

---

**End of Specification**
