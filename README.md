# FlashForge TypeScript API
This is a *work-in-progress* API for FlashForge 3D printers, created through reverse-engineering of the communication between the printer(s) and FlashForge software, as well as the software itself.
<br>

Based on my previous C# API [here](https://github.com/GhostTypes/ff-5mp-api), this is designed for easier cross-platform usage and development.
<br>

## Printer Coverage & Testing
| Printer  | Supported | Tested | API |
| ------------- | ------------- | ------------- | ------------- |
| Adventurer 5X  | Yes? (Needs work)  | No  | HTTP (New) + TCP (Additional Features)  |
| Adventurer 5M/Pro  | Yes  | Yes  | HTTP (New) + TCP (Additional Features)  |
| Adventurer 3/4  | Yes?  | Partially  | TCP (Legacy Mode)  |
| Guider III/II  | Yes?  | No  | TCP (Legacy Mode)  |

## Feature Coverage
- Legacy Mode covers all network-enabled printers before the Adventurer 5 series

| ------------- | Legacy Mode | "New" API |
| ------------- | ------------- | ------------- |
| Get Recent & Local Files  | Yes  | Yes  |
| Get Model Preview Images  | Yes (Slow)  | Yes (Fast!)  |
| Full Job Control (Start, Stop, Pause, Resume, etc.)  | Yes  | Yes  |
| LED Control (On/Off)  | Yes  | Yes  |
| Uploading New Files  | No (Not planned)  | Yes  |
| Printer Information  | Limited  | Yes  |
| (Extra) Job Information  | Very Limited  | Yes  |
| Job Time & ETA  | Not Available  | Yes  |
| Homing/Direct G&M Code Control  | Yes  | Yes  |

