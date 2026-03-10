# TypeScript and Python Parity

The TypeScript and Python FlashForge APIs share a common protocol and model baseline, but they do not promise strict 1:1 public API parity.

## Shared Core

These concepts are expected to exist in both libraries:

- modern client for Adventurer 5M, 5M Pro, and AD5X
- discovery support for modern and legacy FlashForge models
- HTTP control/info/job/files/temp modules
- low-level TCP client access
- AD5X job and material-station models
- machine-info and response-model coverage

## TypeScript-Shaped Surface

The TypeScript library intentionally exposes an idiomatic TypeScript surface:

- `FiveMClient` as the primary modern client
- camelCase method names such as `initControl()`, `getRecentFileList()`, and `pausePrintJob()`
- `PrinterDiscovery` as the primary discovery entry point
- explicit lower-level TCP classes for legacy and direct G-code usage

## Python-Shaped Surface

The Python library intentionally exposes an idiomatic Python surface and keeps some compatibility helpers:

- `FlashForgeClient` as the primary modern client
- snake_case method names such as `init_control()`, `get_recent_file_list()`, and `pause_print_job()`
- async context-manager support with `async with FlashForgeClient(...)`
- convenience wrappers like `pause_print()` and `home_all_axes()`
- compatibility discovery wrapper `FlashForgePrinterDiscovery` in addition to `PrinterDiscovery`
- integration-oriented capability overrides such as `set_feature_overrides(...)`

## Guidance for Downstream Repositories

- Do not assume a symbol exists in one language just because a similar concept exists in the other.
- Treat discovery wrappers and convenience helpers as language-specific unless explicitly documented as shared core.
- When documenting cross-repo behavior, reference the shared capability or protocol concept first, then the language-specific API name.

## Recommended Public Entry Points

| Use Case | TypeScript | Python |
| --- | --- | --- |
| Modern printer client | `FiveMClient` | `FlashForgeClient` |
| Modern discovery API | `PrinterDiscovery` | `PrinterDiscovery` |
| Compatibility discovery API | n/a | `FlashForgePrinterDiscovery` |
| Legacy TCP / low-level access | `FlashForgeClient` / `FlashForgeTcpClient` | `FlashForgeTcpClient` / legacy TCP client modules |

## Non-Goals

The repositories do not currently guarantee:

- identical class names
- identical helper names
- identical convenience wrappers
- identical compatibility shims

They do aim to stay aligned on protocol behavior, capability coverage, and core printer models.
