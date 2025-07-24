# FlashForge TypeScript API - Development Progress

## Current Task: AD5X Upload Feature Implementation

### Overview
Implementing AD5X-specific file upload functionality that supports material station operations. This feature will enable uploading G-code files with material mappings for multi-color printing on AD5X printers with Intelligent Filament System (IFS) support.

### Implementation Plan

**Goal**: Add `uploadFileAD5X()` method to JobControl class that:
- Accepts file path and material station mappings
- Base64 encodes material mappings for HTTP headers  
- Uses same /uploadFile endpoint with AD5X-specific headers
- Reuses existing AD5X validation and material mapping types
- Integrates seamlessly with existing UI material matching dialog

**API Format** (from Wireshark capture):
```
POST /uploadGcode
Headers:
  serialNumber: SNMQRE9400951
  checkCode: 0e35a229  
  fileSize: 735095
  printNow: true
  levelingBeforePrint: true
  flowCalibration: false
  firstLayerInspection: false
  timeLapseVideo: false
  useMatlStation: true
  gcodeToolCnt: 4
  materialMappings: W3sid... (base64 encoded JSON array)
```

**Key Design Decisions**:
- Reuse existing `AD5XMaterialMapping` type for consistency
- Follow same validation patterns as `startAD5XMultiColorJob()`  
- Use identical error handling and logging as existing `uploadFile()`
- Maintain backward compatibility - new method doesn't affect existing uploads

### Implementation Tasks

1. **✅ Planning Phase**
   - [x] Analyze Wireshark capture format
   - [x] Review existing JobControl upload implementation  
   - [x] Identify reusable types and validation methods
   - [x] Plan integration with UI material matching dialog

2. **✅ Implementation Phase** 
   - [x] Add `AD5XUploadParams` interface to ff-models.ts
   - [x] Add base64 encoding utility to JobControl.ts
   - [x] Implement `uploadFileAD5X()` method in JobControl.ts
   - [x] Update index.ts exports
   - [x] Verify with typecheck and lint

3. **✅ Integration Phase**
   - [x] Document usage examples
   - [ ] Test with UI project integration
   - [ ] Validate against real AD5X hardware

### Code Reuse Strategy

**Existing Components to Reuse**:
- `AD5XMaterialMapping` interface (ff-models.ts)
- `validateAD5XPrinter()` method (JobControl.ts)  
- `validateMaterialMappings()` method (JobControl.ts)
- FormData upload pattern from `uploadFile()` (JobControl.ts)
- Error handling and logging patterns

**New Components Needed**:
- `AD5XUploadParams` interface - extends basic upload with material options
- `encodeMaterialMappingsToBase64()` - utility for header encoding
- `uploadFileAD5X()` - main implementation method

### Benefits

- **Minimal New Code**: ~100-150 lines total by reusing existing logic
- **Type Safety**: Full TypeScript support with existing branded types  
- **UI Integration**: Works with existing material matching dialog
- **Backward Compatible**: No changes to existing upload functionality
- **Follows Patterns**: Consistent with established JobControl architecture

---

## Implementation Complete ✅

### Changes Made

**1. New Type Definition** (`src/models/ff-models.ts`)
```typescript
export interface AD5XUploadParams {
    filePath: string;                    // Local file path to upload
    startPrint: boolean;                 // Start printing after upload
    levelingBeforePrint: boolean;        // Perform bed leveling first
    flowCalibration: boolean;            // Enable flow calibration
    firstLayerInspection: boolean;       // Enable first layer inspection
    timeLapseVideo: boolean;             // Enable time lapse recording
    materialMappings: AD5XMaterialMapping[]; // Material station mappings
}
```

**2. Base64 Encoding Utility** (`src/api/controls/JobControl.ts`)
```typescript
private encodeMaterialMappingsToBase64(mappings: AD5XMaterialMapping[]): string {
    const jsonString = JSON.stringify(mappings);
    return Buffer.from(jsonString, 'utf8').toString('base64');
}
```

**3. Main Upload Method** (`src/api/controls/JobControl.ts`)
```typescript
public async uploadFileAD5X(params: AD5XUploadParams): Promise<boolean>
```

**4. Updated Exports** (`src/index.ts`)
- Added `AD5XUploadParams` to public API exports

### Usage Examples

**Basic Usage:**
```typescript
import { FiveMClient, AD5XUploadParams, AD5XMaterialMapping } from 'ff-api';

const client = new FiveMClient('192.168.1.100:8899', 'SERIAL123', 'CHECKCODE');
await client.initialize();

// Example material mappings from UI material matching dialog
const materialMappings: AD5XMaterialMapping[] = [
    {
        toolId: 0,
        slotId: 1, 
        materialName: "PLA",
        toolMaterialColor: "#FFFFFF",
        slotMaterialColor: "#FFFFFF"
    },
    {
        toolId: 1,
        slotId: 2,
        materialName: "SILK", 
        toolMaterialColor: "#FFFF80",
        slotMaterialColor: "#FEF043"
    }
];

const uploadParams: AD5XUploadParams = {
    filePath: '/path/to/multicolor-model.3mf',
    startPrint: true,
    levelingBeforePrint: true,
    flowCalibration: false,
    firstLayerInspection: false, 
    timeLapseVideo: false,
    materialMappings
};

const success = await client.jobControl.uploadFileAD5X(uploadParams);
if (success) {
    console.log('Upload and print started successfully!');
} else {
    console.error('Upload failed');
}
```

### UI Project Integration

**For existing UI projects using this API:**

1. **Get Material Mappings**: Use existing material matching dialog to get `AD5XMaterialMapping[]`

2. **Call Upload Method**: Replace regular upload with AD5X version
```typescript
// Instead of:
// await backend.uploadFile(filePath, startPrint, leveling);

// Use:
const params: AD5XUploadParams = {
    filePath,
    startPrint,
    levelingBeforePrint: leveling,
    flowCalibration: false,    // Configure as needed
    firstLayerInspection: false,
    timeLapseVideo: false,
    materialMappings           // From material matching dialog
};
await backend.fiveMClient.jobControl.uploadFileAD5X(params);
```

3. **Material Matching Flow**:
   - Detect AD5X printer
   - Show material matching dialog for multi-material files
   - Get `AD5XMaterialMapping[]` from dialog
   - Call `uploadFileAD5X()` with mappings

### Validation & Error Handling

- **Printer Validation**: Only works with AD5X printers (automatic validation)
- **Material Validation**: Validates tool IDs (0-3), slot IDs (1-4), color format (#RRGGBB)
- **File Validation**: Checks file existence before upload
- **Comprehensive Logging**: Detailed error messages and upload progress
- **Network Error Handling**: Same robust error handling as regular uploads

### Wire Protocol Details

**HTTP Headers Sent:**
```
POST /uploadGcode
serialNumber: SNMQRE9400951
checkCode: 0e35a229
fileSize: 735095
printNow: true
levelingBeforePrint: true
flowCalibration: false
firstLayerInspection: false
timeLapseVideo: false
useMatlStation: true
gcodeToolCnt: 4
materialMappings: W3sid... (base64 encoded JSON)
```

**Base64 Decoded materialMappings:**
```json
[
    {
        "toolId": 0,
        "slotId": 1,
        "materialName": "PLA",
        "toolMaterialColor": "#FFFFFF",
        "slotMaterialColor": "#FFFFFF"
    }
    // ... more mappings
]
```

### Benefits Achieved

- **✅ Minimal New Code**: Only ~150 lines added
- **✅ Type Safety**: Full TypeScript support with strict types
- **✅ Reused Logic**: Leveraged existing validation and patterns
- **✅ UI Compatible**: Works with existing material matching dialog
- **✅ Backward Compatible**: No changes to existing upload functionality
- **✅ Wire Compatible**: Matches exact API format from Wireshark capture

---

## Development Notes

**Implementation completed successfully.** All static analysis checks passed:
- TypeScript compilation: ✅ 
- Strict type checking: ✅
- Generated declaration files: ✅
- Export validation: ✅

**Next Steps**: Integration testing with UI project and validation against real AD5X hardware.
