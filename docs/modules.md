# Modules and Namespaces

The API is organized into several control modules, typically accessed through the `FiveMClient` instance. Each module groups related functionality.

## Control (`client.control`)

Handles general printer operations and hardware control.

### Key Methods

- **`homeAxes()`**: Homes all axes.
- **`setLedOn() / setLedOff()`**: Controls the internal LED lights.
- **`setChamberFanSpeed(speed)`**: Sets the chamber fan speed percentage (0-100).
- **`setCoolingFanSpeed(speed)`**: Sets the part cooling fan speed percentage (0-100).
- **`setInternalFiltrationOn() / setExternalFiltrationOn()`**: Controls the air filtration system.

## JobControl (`client.jobControl`)

Manages the lifecycle of print jobs and file uploads.

### Key Methods

- **`pausePrintJob()`**: Pauses the active print.
- **`resumePrintJob()`**: Resumes a paused print.
- **`cancelPrintJob()`**: Cancels the active print.
- **`uploadFile(path, start, level)`**: Uploads a file and optionally starts it.
- **`uploadFileAD5X(params)`**: Specialized upload for AD5X with material mapping support.
- **`startAD5XMultiColorJob(params)`**: Starts a multi-color print from a local file on AD5X.

## Info (`client.info`)

Retrieves status and information.

### Key Methods

- **`get()`**: Returns a `Promise<FFMachineInfo>` with the latest printer state.
- **`isPrinting()`**: Returns `true` if the printer is currently printing.
- **`getStatus()`**: Returns the raw status string.

## Files (`client.files`)

Handles file listing and thumbnail retrieval.

### Key Methods

- **`getRecentFileList()`**: Returns a list of recently printed files.
- **`getGCodeThumbnail(fileName)`**: Returns a `Buffer` containing the thumbnail image for a specific file.

## TempControl (`client.tempControl`)

Manages heating elements.

### Key Methods

- **`setExtruderTemp(temp)`**: Sets the target extruder temperature.
- **`setBedTemp(temp)`**: Sets the target bed temperature.
