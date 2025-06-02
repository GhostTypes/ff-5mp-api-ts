# 🖨️ FlashForge TypeScript API

> 🔧 A robust, cross-platform API for FlashForge 3D printers, created through reverse-engineering of the communication between the printer(s) and FlashForge software.

## 🌟 About

Built upon the foundation of my previous [C# API](https://github.com/GhostTypes/ff-5mp-api), this TypeScript implementation is designed for **easier cross-platform usage and development**.

---

## 🖨️ Printer Coverage & Testing

| 🖨️ Printer | ✅ Supported | 🧪 Tested | 🔌 API |
|-------------|--------------|-----------|--------|
| **Adventurer 5X** | ⚠️ Not sure | ❌ No | HTTP (New) + TCP (Additional Features) |
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

*Documentation and installation instructions coming soon...*
        
