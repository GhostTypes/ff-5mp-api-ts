# Modules and Namespaces

The TypeScript API is organized into modules hanging off `FiveMClient`.

## Control (`client.control`)

Key methods:

- `homeAxes()`
- `homeAxesRapid()`
- `setLedOn()`
- `setLedOff()`
- `turnCameraOn()`
- `turnCameraOff()`
- `setInternalFiltrationOn()`
- `setExternalFiltrationOn()`
- `setFiltrationOff()`
- `setSpeedOverride(speed)`
- `setZAxisOverride(offset)`

## JobControl (`client.jobControl`)

Key methods:

- `pausePrintJob()`
- `resumePrintJob()`
- `cancelPrintJob()`
- `uploadFile(filePath, startPrint, levelBeforePrint)`
- `uploadFileAD5X(params)`
- `printLocalFile(fileName, levelingBeforePrint)`
- `startAD5XMultiColorJob(params)`
- `startAD5XSingleColorJob(params)`

## Info (`client.info`)

Key methods:

- `get()`
- `getDetailResponse()`
- `getStatus()`
- `getMachineState()`
- `isPrinting()`

## Files (`client.files`)

Key methods:

- `getLocalFileList()`
- `getRecentFileList()`
- `getGCodeThumbnail(fileName)`

## TempControl (`client.tempControl`)

Key methods:

- `setExtruderTemp(temp, waitFor?)`
- `setBedTemp(temp, waitFor?)`
