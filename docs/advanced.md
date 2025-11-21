# Advanced Topics

## Multi-Color Printing (AD5X)

The Adventurer 5X (AD5X) supports multi-material printing via its Intelligent Filament Station (IFS). The API allows you to map tools (extruders) in your G-code to specific slots in the IFS.

### Material Mapping

To start a multi-color print, you need to define `AD5XMaterialMapping` objects.

```typescript
import { AD5XMaterialMapping } from '@ghosttypes/ff-api';

const mappings: AD5XMaterialMapping[] = [
    {
        toolId: 0,            // The first tool in the G-code
        slotId: 1,            // Use filament from Slot 1
        materialName: "PLA",
        toolMaterialColor: "#FF0000", // Color defined in slicer
        slotMaterialColor: "#FF0000"  // Actual color in slot
    },
    {
        toolId: 1,
        slotId: 2,
        materialName: "PLA",
        toolMaterialColor: "#0000FF",
        slotMaterialColor: "#0000FF"
    }
];
```

### Starting a Job

You can start a job with these mappings using `startAD5XMultiColorJob` (for local files) or `uploadFileAD5X` (for new uploads).

```typescript
await client.jobControl.startAD5XMultiColorJob({
    fileName: "multi_color_model.gcode",
    levelingBeforePrint: true,
    materialMappings: mappings
});
```

## Direct G-Code Control

For advanced users, you may need to send raw G-code commands that aren't exposed by the high-level API. You can access the underlying `FlashForgeClient` via `client.tcpClient`.

```typescript
// Send a raw G-code command
const response = await client.tcpClient.sendRawCmd("~G1 X100 Y100 F3000");
console.log(response); // Output from printer
```

*Note: Use raw commands with caution. Incorrect G-code can damage the printer.*

## Image Preview Handling

The API allows retrieving thumbnail previews for G-code files. This is useful for building UI applications.

```typescript
const thumbnailBuffer = await client.files.getGCodeThumbnail("model.gcode");

if (thumbnailBuffer) {
    // Save to file
    fs.writeFileSync("preview.png", thumbnailBuffer);

    // Or convert to base64 for web display
    const base64Image = thumbnailBuffer.toString('base64');
    const imgSrc = `data:image/png;base64,${base64Image}`;
}
```

## Firmware Version Handling

The library automatically detects the printer's firmware version. Some features (especially file uploads and print starting) have different payload requirements for newer firmware versions (>= 3.1.3). The `JobControl` class handles this logic internally, so you generally don't need to worry about it. However, if you encounter issues with a specific firmware version, check `client.firmVer`.
