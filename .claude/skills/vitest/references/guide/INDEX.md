# Vitest Guide

This directory contains comprehensive Vitest usage guides organized by topic.

## Quick Start

- **[Getting Started](index.md)** - Introduction, installation, and first test
- **[Features](features.md)** - Overview of Vitest capabilities
- **[Why Vitest](why.md)** - Benefits and use cases
- **[CLI](cli.md)** - Command-line interface reference

## Core Testing Concepts

- **[Lifecycle](lifecycle.md)** - Test hooks and setup/teardown
- **[Test Context](test-context.md)** - Using test context for sharing data
- **[Test Annotations](test-annotations.md)** - Test skipping, only, and annotations
- **[Test Tags](test-tags.md)** - Organizing tests with tags
- **[Filtering](filtering.md)** - Running specific tests
- **[Parallelism](parallelism.md)** - Parallel test execution

## Mocking & Test Doubles

- **[Mocking](mocking.md)** - Overview of mocking capabilities
- **[Functions](mocking/functions.md)** - Mocking functions
- **[Modules](mocking/modules.md)** - Mocking modules
- **[Globals](mocking/globals.md)** - Mocking global objects
- **[Timers](mocking/timers.md)** - Mocking timers
- **[Dates](mocking/dates.md)** - Mocking dates
- **[Classes](mocking/classes.md)** - Mocking classes
- **[Requests](mocking/requests.md)** - Mocking network requests
- **[File System](mocking/file-system.md)** - Mocking file system

## Advanced Features

- **[In-Source Testing](in-source.md)** - Writing tests next to code
- **[Projects](projects.md)** - Monorepo and multi-project setup
- **[Workspace](../examples/projects-workspace.md)** - Workspace configuration
- **[Coverage](coverage.md)** - Code coverage configuration
- **[Snapshot](snapshot.md)** - Snapshot testing
- **[UI](ui.md)** - Visual test UI
- **[Browser Testing](browser/index.md)** - Browser mode testing (see subdirectory below)

## Specialized Testing

- **[Testing Types](testing-types.md)** - Type testing
- **[Environment](environment.md)** - Test environment configuration
- **[Extending Matchers](extending-matchers.md)** - Custom matchers

## Tooling Integration

- **[IDE](ide.md)** - IDE integration (VS Code, WebStorm)
- **[Reporters](reporters.md)** - Test reporters and output formats
- **[Plugins](using-plugins.md)** - Using Vite plugins
- **[Open Telemetry](open-telemetry.md)** - Observability integration

## Performance & Debugging

- **[Debugging](debugging.md)** - Debugging tests
- **[Improving Performance](improving-performance.md)** - Performance optimization
- **[Profiling Test Performance](profiling-test-performance.md)** - Test profiling

## Migration & Comparisons

- **[Migration Guide](migration.md)** - Migrating from older Vitest versions
- **[Comparisons](comparisons.md)** - Comparisons with Jest, Cypress, and other frameworks

## Error Handling

- **[Common Errors](common-errors.md)** - Troubleshooting common issues

## Browser Testing (Advanced)

See [Browser Testing](browser/) subdirectory for:
- Component testing
- Multiple browser setups
- Trace view debugging
- Visual regression testing

## Advanced Topics

See [Advanced](advanced/) subdirectory for:
- Worker pools
- Custom reporters
- Advanced test patterns
