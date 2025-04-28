# FlashForge TypeScript API
This is a *work-in-progress* API for FlashForge 3D printers, created through reverse-engineering of the communication between the printer(s) and FlashForge software, as well as the software itself.
<br>

Based on my previous C# API [here](https://github.com/GhostTypes/ff-5mp-api), this is designed for easier cross-platform usage and development.
<br>

While the current repository naming suggests, and previous API only supported the 5M/Pro, this will support all network-enabled FlashForge printers - as long as it's compatible with either FlashPrint or Orca-FlashForge.
<br>

## Feature Coverage
- [x] Automatic discovery of FlashForge printers on the local network
- [x] Communication and control of the "legacy" TCP API & "new" HTTP Rest API (used by FlashPrint and Orca-FlashForge)
- [x] Sending G/M Code commands (older printers use this for everything, newer printers need this for things like homing the axes)
- [x] Retrieving (last 10) recent job list and full local file list
- [x] Retrieving (current) job information , printer and system information, and much more (for both "legacy" and "new" API) 
- [x] Job Control (Start a Local Job, Pause, Resume, Stop)

## Printer Coverage
- [x] Adventurer 5M / Pro (All *Stock* firmware versions)
- [ ] Adventurer 4
- [ ] Adventurer 3
- [ ] Guider III
- [ ] Guider II
- [ ] Guider
