# 🖨️ FlashForge TypeScript API

> 🔧 A robust, cross-platform API for FlashForge 3D printers, created through reverse-engineering of the communication between the printer(s) and FlashForge software.

## 🌟 About

Built upon the foundation of my previous [C# API](https://github.com/GhostTypes/ff-5mp-api), this TypeScript implementation is designed for **easier cross-platform usage and development**.

---

## 🖨️ Printer Coverage & Testing
| 🖨️ Printer | ✅ Supported | 🧪 Tested | 🔌 API |
|-------------|--------------|-----------|--------|
| **Adventurer 5X** | ⚠️ Basic | ✅ Yes | HTTP (New) + TCP (Additional Features) |
| **Adventurer 5M/Pro** | ✅ Yes | ✅ Yes | HTTP (New) + TCP (Additional Features) |
| **Adventurer 3/4** | ✅ Yes | 🔄 Partially | TCP (Legacy Mode) |

---

## ⚡ Feature Coverage

> 💡 **Legacy Mode** covers all network-enabled printers before the Adventurer 5 series

| 🔧 Feature | 🔄 Legacy Mode | 🆕 "New" API |
|------------|----------------|---------------|
| 📁 **Get Recent & Local Files** | ✅ Yes | ✅ Yes |
| 🖼️ **Get Model Preview Images** | ✅ Yes (Slow) | ⚡ Yes (Fast!) |
| 🎮 **Full Job Control** (Start, Stop, Pause, Resume, etc.) | ✅ Yes | ✅ Yes |
| 💡 **LED Control** (On/Off) | ✅ Yes | ✅ Yes |
| 📤 **Uploading New Files** | ❌ No (Not planned) | ✅ Yes |
| ℹ️ **Printer Information** | ⚠️ Limited | ✅ Yes |
| 📊 **(Extra) Job Information** | ⚠️ Very Limited | ✅ Yes |
| ⏰ **Job Time & ETA** | ❌ Not Available | ✅ Yes |
| 🏠 **Homing/Direct G&M Code Control** | ✅ Yes | ✅ Yes |

---

## 🚀 Getting Started

This guide will walk you through using the API with different generations of FlashForge printers.

### Legacy Printers (Adventurer 3/4, etc.)

Older FlashForge printers use a "legacy" TCP-based API. This API is more limited but still provides core functionality like job control and status monitoring.

To connect to a legacy printer, you only need its IP address.

```typescript
import { FlashForgeClient } from './src';

async function main() {
    // Replace with your printer's IP address
    const client = new FlashForgeClient('192.168.1.100');

    if (await client.initControl()) {
        console.log("Successfully connected to printer.");

        // Example: Turn on the LED
        await client.ledOn();

        // Example: Get printer info
        const info = await client.getPrinterInfo();
        if (info) {
            console.log(`Printer Type: ${info.TypeName}`);
            console.log(`Firmware: ${info.FirmwareVersion}`);
        }

        // Remember to dispose of the client when done
        await client.dispose();
    } else {
        console.log("Failed to connect to printer.");
    }
}

main();
```

**Functionality Notes:**
- **Basic Control:** Full control over starting, stopping, and pausing jobs.
- **Status Monitoring:** Get basic printer info, temperature, and job progress.
- **No File Uploads:** The legacy API does not support uploading files. You must print files already on the printer.
- **Slower Thumbnails:** Retrieving model preview images can be slow.

---

### Adventurer 5M / 5M Pro

The Adventurer 5 series introduced a new, more powerful HTTP-based API, while retaining the legacy TCP API for specific features like direct G-code control. This hybrid approach offers the best of both worlds.

To connect, you'll need the printer's IP address, serial number, and a "check code". These can be found in the printer's network settings.

```typescript
import { FiveMClient } from './src';

async function main() {
    // Replace with your printer's details
    const client = new FiveMClient(
        '192.168.1.101',
        'SNADVA5M12345',
        '12345'
    );

    if (await client.initialize()) {
        console.log("Successfully connected to printer.");
        console.log(`Printer Name: ${client.printerName}`);
        console.log(`Firmware: ${client.firmwareVersion}`);

        // Example: Get a list of local files
        const files = await client.files.getLocalFiles();
        if (files) {
            console.log("Files on printer:", files.map(f => f.name));
        }

        // Example: Upload a file
        // await client.files.uploadFile('path/to/your/file.gcode');

        // The FiveMClient also includes the legacy TCP client for direct G-code
        await client.tcpClient.homeAxes();

        await client.dispose();
    } else {
        console.log("Failed to connect.");
    }
}

main();
```

**Functionality Notes:**
- **All Legacy Features:** Includes all capabilities of the legacy API.
- **File Uploads:** Easily upload G-code files directly to the printer.
- **Rich Information:** Access detailed information about the printer, job status, and print time estimates.
- **Fast Thumbnails:** Model previews are retrieved quickly over the HTTP API.

---

### Adventurer 5X (AD5X)

The AD5X uses the same powerful HTTP API as the 5M series but adds specialized support for its **Intelligent Filament Station (IFS)**, enabling multi-color and multi-material printing. The API provides dedicated methods and data models to manage this functionality.

Connecting to an AD5X is identical to a standard 5M.

#### Checking the Material Station (IFS)

After connecting, you can get detailed information about the Intelligent Filament Station. The `FFMachineInfo` object, accessible via `client.info.machineInfo` after a successful connection, contains all the details.

The `MatlStationInfo` property provides a comprehensive status of the IFS, including the state of each slot.

```typescript
import { FiveMClient } from './src';

async function checkIFS() {
    const client = new FiveMClient('192.168.1.102', 'SNADVA5X12345', '54321');
    if (!await client.initialize() || !client.isAD5X) {
        console.log("Failed to connect or not an AD5X.");
        return;
    }

    const machineInfo = client.info.machineInfo;

    if (machineInfo && machineInfo.HasMatlStation && machineInfo.MatlStationInfo) {
        console.log("Intelligent Filament Station (IFS) Detected.");

        const ifs = machineInfo.MatlStationInfo;
        console.log(`- Active Slot: ${ifs.currentSlot}`);
        console.log(`- Loading Slot: ${ifs.currentLoadSlot}`);
        console.log("- Slot Details:");

        for (const slot of ifs.slotInfos) {
            if (slot.hasFilament) {
                console.log(`  - Slot ${slot.slotId}: [${slot.materialName}] - Color: ${slot.materialColor}`);
            } else {
                console.log(`  - Slot ${slot.slotId}: [Empty]`);
            }
        }
    } else {
        console.log("No Intelligent Filament Station detected.");
    }

    await client.dispose();
}

checkIFS();
```

#### Starting a Multi-Color Print

To start a multi-color print, you need to provide `materialMappings`. This array links the tool ID from your G-code file to a specific slot in the material station.

- `toolId`: The tool index from your slicing software (0-3).
- `slotId`: The physical slot on the material station (1-4).

```typescript
import { FiveMClient, AD5XLocalJobParams, AD5XMaterialMapping } from './src';

async function startMultiColor() {
    const client = new FiveMClient('192.168.1.102', 'SNADVA5X12345', '54321');
    if (!await client.initialize() || !client.isAD5X) {
        console.log("Failed to connect or not an AD5X.");
        return;
    }

    const mappings: AD5XMaterialMapping[] = [
        { toolId: 0, slotId: 1, materialName: "PLA", toolMaterialColor: "#FF0000", slotMaterialColor: "#FF0000" },
        { toolId: 1, slotId: 2, materialName: "PLA", toolMaterialColor: "#00FF00", slotMaterialColor: "#00FF00" }
    ];

    const jobParams: AD5XLocalJobParams = {
        fileName: 'my_multi_color_print.gcode',
        levelingBeforePrint: true,
        materialMappings: mappings
    };

    if (await client.jobControl.startAD5XMultiColorJob(jobParams)) {
        console.log("Multi-color job started successfully!");
    }

    await client.dispose();
}
```

#### Starting a Single-Color Print

For single-color prints, you can use a simpler method that doesn't require material mappings. The printer will use the currently loaded filament.

```typescript
import { FiveMClient, AD5XSingleColorJobParams } from './src';

async function startSingleColor() {
    const client = new FiveMClient('192.168.1.102', 'SNADVA5X12345', '54321');
    if (!await client.initialize() || !client.isAD5X) {
        console.log("Failed to connect or not an AD5X.");
        return;
    }

    const jobParams: AD5XSingleColorJobParams = {
        fileName: 'my_single_color_print.gcode',
        levelingBeforePrint: true
    };

    if (await client.jobControl.startAD5XSingleColorJob(jobParams)) {
        console.log("Single-color job started successfully!");
    }

    await client.dispose();
}
```

#### Uploading Files for AD5X

You can also upload files with material mappings directly using `uploadFileAD5X`. The `materialMappings` are Base64-encoded and sent in the headers automatically.

**Functionality Notes:**
- **All 5M/Pro Features:** Inherits all functionality from the standard 5M series.
- **Intelligent Filament Station (IFS):** Provides detailed status and control over the multi-material station.
- **Material Mapping:** Allows precise control over which filament is used for each part of a multi-material print.
- **Dedicated Job Methods:** Separate, validated methods for starting single-color and multi-color jobs simplify development.
        
