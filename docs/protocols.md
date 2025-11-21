# Protocol Documentation

The FlashForge API utilizes two distinct protocols for communication. Understanding these can help when troubleshooting or extending the library.

## TCP Protocol (Legacy & Low-Level)

This is the traditional communication method used by FlashForge printers. It involves opening a raw TCP socket on port **8899**.

### Characteristics
- **Port**: 8899
- **Format**: G-code / M-code commands (ASCII text)
- **Line Ending**: `\n` or `\r\n`
- **Response**: Multi-line text response, typically ending with `ok` or a specific success marker.

### Common Commands
- `~M115`: Get firmware info.
- `~M119`: Get endstop status.
- `~M105`: Get temperatures.
- `~G28`: Auto home.
- `~M27`: Get print status.

### Usage in Library
The `FlashForgeTcpClient` and `FlashForgeClient` classes implement this protocol. The `FiveMClient` uses it internally for operations that are not exposed or are less reliable via the HTTP API, such as:
- Moving axes manually (`move`).
- Detailed endstop status.
- Specific filament loading procedures.

## HTTP API (Modern)

Newer printers (Adventurer 5M, 5M Pro, AD5X) expose a RESTful HTTP API on port **8898**.

### Characteristics
- **Port**: 8898
- **Format**: JSON payloads and responses.
- **Authentication**: Requires `serialNumber` and `checkCode` in the request body or headers.

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/control` | POST | Sends control commands (light, fans, job control). |
| `/detail` | POST | Retrieves detailed machine status. |
| `/product` | POST | Retrieves capability flags (led, fans, etc.). |
| `/uploadGcode` | POST | Uploads files (multipart/form-data). |
| `/printGcode` | POST | Starts a print job from a local file. |
| `/gcodeThumb` | POST | Retrieves file thumbnails. |

### Usage in Library
The `FiveMClient` primarily uses this protocol for:
- Monitoring printer status (`/detail`).
- Uploading files.
- Starting and stopping prints.
- Controlling fans and lights (via `/control`).

### When to use which?

- **HTTP API**: Preferred for 5M/AD5X series. It's more robust for state management and file operations.
- **TCP API**: Required for legacy printers. Also used as a fallback or for specific real-time control commands (like jogging the print head) on newer printers.
