<div align="center">
  <h1>FlashForge TypeScript API</h1>
  <p>
    <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/pnpm-8F0B8B?style=for-the-badge&logo=pnpm&logoColor=white" alt="pnpm">
    <img src="https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white" alt="Jest">
    <img src="https://img.shields.io/badge/axios-671ddf?style=for-the-badge&logo=axios&logoColor=white" alt="Axios">
  </p>
  <p>
    <img src="https://img.shields.io/github/stars/GhostTypes/ff-5mp-api-ts.svg?style=for-the-badge&labelColor=black&color=yellow" alt="Stars">
    <img src="https://img.shields.io/github/forks/GhostTypes/ff-5mp-api-ts.svg?style=for-the-badge&labelColor=black&color=blue" alt="Forks">
  </p>
  <p>
    A robust, cross-platform API for FlashForge 3D printers, created through
    reverse-engineering the communication between the printers and FlashForge software.
  </p>
  <p>
    <a href="docs/README.md"><strong>Explore the Docs »</strong></a>
  </p>
</div>


<br>
<div align="center">
  <h2>Printer Coverage & Testing</h2>
</div>

<div align="center">
<table>
  <tr>
    <th>Printer</th>
    <th>Supported</th>
    <th>Tested</th>
    <th>API</th>
  </tr>

  <tr>
    <td><strong>Adventurer 5X</strong></td>
    <td>Yes</td>
    <td>Yes</td>
    <td>HTTP + TCP</td>
  </tr>

  <tr>
    <td><strong>Adventurer 5M / 5M Pro</strong></td>
    <td>Yes</td>
    <td>Yes</td>
    <td>HTTP + TCP</td>
  </tr>

  <tr>
    <td><strong>Adventurer 3 / 4</strong></td>
    <td>Yes</td>
    <td>Partial</td>
    <td>TCP Only</td>
  </tr>
</table>
</div>

<br>

<div align="center">
  <h2>Feature Coverage</h2>
</div>

<div align="center">
<table>
  <tr>
    <th>Feature</th>
    <th>TCP Only</th>
    <th>TCP + HTTP</th>
  </tr>

  <tr>
    <td>Get Recent & Local Files</td>
    <td>Yes</td>
    <td>Yes</td>
  </tr>

  <tr>
    <td>Model Preview Images</td>
    <td>Yes (Slow)</td>
    <td>Yes (Fast)</td>
  </tr>

  <tr>
    <td>Full Job Control<br><small>(Start / Stop / Pause / Resume)</small></td>
    <td>Yes</td>
    <td>Yes</td>
  </tr>

  <tr>
    <td>LED Control</td>
    <td>Yes</td>
    <td>Yes</td>
  </tr>

  <tr>
    <td>Upload New Files</td>
    <td>No (Not planned)</td>
    <td>Yes</td>
  </tr>

  <tr>
    <td>Printer Information</td>
    <td>Limited</td>
    <td>Yes</td>
  </tr>

  <tr>
    <td>Job Information</td>
    <td>Very Limited</td>
    <td>Yes</td>
  </tr>

  <tr>
    <td>Job Time & ETA</td>
    <td>Not Available</td>
    <td>Yes</td>
  </tr>

  <tr>
    <td>Homing / Direct G&M Code Control</td>
    <td>Yes</td>
    <td>Yes</td>
  </tr>
</table>
</div>

<br>

<div align="center">
  <h2>Getting Started</h2>
  <p>
    This section covers how to use the API with both legacy FlashForge printers and
    newer models such as the Adventurer 5M / 5M Pro and AD5X.
  </p>
</div>

<br>

<div align="center">
  <h3>Legacy Printers (Adventurer 3 / 4)</h3>
  <p>
    Legacy FlashForge printers use a TCP-based protocol which provides basic job control,
    printer information, and status monitoring. Connecting only requires the printer’s IP address.
  </p>
</div>

```typescript
import { FlashForgeClient } from 'ff-api';

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

        await client.dispose();
    } else {
        console.log("Failed to connect to printer.");
    }
}

main();
```
<br>
<div align="center"> 
    <h3>Adventurer 5M / 5M Pro</h3>
    <p> The Adventurer 5 series uses an improved HTTP API for fast, modern communication, while still supporting legacy TCP-based G-code control. You will need the printer’s <strong>IP address</strong>, <strong>serial number</strong>, and <strong>check code</strong></p>
</div>

```typescript
import { FiveMClient } from 'ff-api';

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

<div align="center">   
    <h3>Adventurer 5X (AD5X)</h3>  
    <p>The AD5X uses the same powerful HTTP API as the 5M series but adds specialized support for its <strong>Intelligent Filament Station (IFS)</strong>, enabling multi-color and multi-material printing. The API provides dedicated methods and data models to manage this functionality.</p>   
    <p> Connecting to an AD5X is identical to a standard 5M. </p> 
</div>

```typescript
import { FiveMClient } from 'ff-api';

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

<div align="center">   <h4>Starting a Multi-Color Print</h4>   <p>     To start a multi-color print, you need to provide <code>materialMappings</code>. This array links the tool ID from your G-code file to a specific slot in the material station.   </p>   <p>         - <code>toolId</code>: The tool index from your slicing software (0-3).        


- <code>slotId</code>: The physical slot on the material station (1-4).   </p> </div>

```typescript
import { FiveMClient, AD5XLocalJobParams, AD5XMaterialMapping } from 'ff-api';

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

<div align="center">   <h4>Starting a Single-Color Print</h4>   <p>     For single-color prints, you can use a simpler method that doesn't require material mappings. The printer will use the currently loaded filament.   </p> </div>

```typescript
import { FiveMClient, AD5XSingleColorJobParams } from 'ff-api';

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

<div align="center">   <h4>Uploading Files for AD5X</h4>   <p>     You can also upload files with material mappings directly using <code>uploadFileAD5X</code>. The material mappings are Base64-encoded and sent in the headers automatically.  </p> </div>

