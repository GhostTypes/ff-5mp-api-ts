# Vitest Configuration Reference

Complete reference for Vitest configuration options.

## Core Configuration

### Test Options
- **[api](api.md)** - API options
- **[alias](alias.md)** - Path aliases
- **[allowOnly](allowonly.md)** - Allow only tests
- **[attachmentsDir](attachmentsdir.md)** - Attachments directory
- **[bail](bail.md)** - Stop on failure
- **[benchmark](benchmark.md)** - Benchmark configuration
- **[cache](cache.md)** - Cache configuration
- **[chaiConfig](chaiconfig.md)** - Chai configuration
- **[clearMocks](clearmocks.md)** - Auto-clear mocks
- **[coverage](coverage.md)** - Code coverage
- **[css](css.md)** - CSS options
- **[deps](deps.md)** - Dependencies
- **[diff](diff.md)** - Diff configuration
- **[dir](dir.md)** - Test directory
- **[disableConsoleIntercept](disableconsoleintercept.md)** - Console intercept
- **[env](env.md)** - Environment variables
- **[environment](environment.md)** - Test environment
- **[environmentOptions](environmentoptions.md)** - Environment options
- **[exclude](exclude.md)** - File exclusion patterns
- **[execArgv](execargv.md)** - Worker exec argv
- **[expandSnapshotDiff](expandsnapshotdiff.md)** - Snapshot diff expansion
- **[expect](expect.md)** - Expect configuration
- **[experimental](experimental.md)** - Experimental features
- **[fakeTimers](faketimers.md)** - Fake timers
- **[fileParallelism](fileparallelism.md)** - File parallelism
- **[forceRerunTriggers](forcereruntriggers.md)** - Rerun triggers
- **[globals](globals.md)** - Global APIs
- **[globalSetup](globalsetup.md)** - Global setup
- **[hideSkippedTests](hideskippedtests.md)** - Hide skipped tests
- **[hookTimeout](hooktimeout.md)** - Hook timeout
- **[include](include.md)** - File inclusion patterns
- **[includeTaskLocation](includetasklocation.md)** - Task location
- **[isolate](isolate.md)** - Test isolation
- **[logHeapUsage](logheapusage.md)** - Heap logging
- **[maxConcurrency](maxconcurrency.md)** - Max concurrency
- **[maxWorkers](maxworkers.md)** - Max workers
- **[mockReset](mockreset.md)** - Mock reset behavior
- **[mode](mode.md)** - Test mode
- **[name](name.md)** - Test name
- **[onConsoleLog](onconsolelog.md)** - Console log handler
- **[onStackTrace](onstacktrace.md)** - Stack trace handler
- **[onUnhandledError](onunhandlederror.md)** - Error handler
- **[open](open.md)** - Open browser/UI
- **[outputFile](outputfile.md)** - Output file
- **[passWithNoTests](passwithnotests.md)** - Pass with no tests
- **[pool](pool.md)** - Worker pool
- **[printConsoleTrace](printconsoletrace.md)** - Console trace
- **[projects](projects.md)** - Multi-project config
- **[provide](provide.md)** - Provide globals
- **[reporters](reporters.md)** - Test reporters
- **[resolveSnapshotPath](resolvesnapshotpath.md)** - Snapshot path
- **[resolveTsConfig](resolvetsconfig.md)** - TSConfig path
- **[restoreMocks](restoremocks.md)** - Auto-restore mocks
- **[root](root.md)** - Project root
- **[runner](runner.md)** - Test runner
- **[sequence](sequence.md)** - Test sequencing
- **[setupFiles](setupfiles.md)** - Setup files
- **[shard](shard.md)** - Test sharding
- **[silent](silent.md)** - Silent mode
- **[snapshotFormat](snapshotformat.md)** - Snapshot format
- **[snapshotEnvironment](snapshotenvironment.md)** - Snapshot environment
- **[snapshotSerializers](snapshotserializeroptions.md)** - Snapshot serializers
- **[slowTestThreshold](slowhoctestthreshold.md)** - Slow test threshold
- **[teardownTimeout](teardowntimeout.md)** - Teardown timeout
- **[testMatch](testmatch.md)** - Test file patterns
- **[testNamePattern](testnamepattern.md)** - Test name pattern
- **[testTimeout](testtimeout.md)** - Default timeout
- **[transformMode](transformmode.md)** - Transform mode
- **[transformModuleWarning](transformmodulewarning.md)** - Transform warnings
- **[types](types.md)** - TypeScript types
- **[update](update.md)** - Update snapshots
- **[watch](watch.md)** - Watch mode

## Browser Configuration

See [Browser](browser/) for browser mode configuration:
- **[api](browser/api.md)** - Browser API
- **[enabled](browser/enabled.md)** - Enable browser mode
- **[headless](browser/headless.md)** - Headless mode
- **[provider](browser/provider.md)** - Browser provider
- **[instances](browser/instances.md)** - Browser instances
- **[isolate](browser/isolate.md)** - Browser isolation
- **[viewport](browser/viewport.md)** - Viewport config
- **[screenshotFailures](browser/screenshotfailures.md)** - Screenshot on failure
- **[screenshotDirectory](browser/screenshotdirectory.md)** - Screenshot dir
- **[testerHtmlPath](browser/testerhtmlpath.md)** - Tester HTML path
- **[preview](browser/preview.md)** - Preview config
- **[ui](browser/ui.md)** - UI options
- **[connectTimeout](browser/connecttimeout.md)** - Connection timeout
- **[trace](browser/trace.md)** - Trace options
- **[commands](browser/commands.md)** - Browser commands
- **[locators](browser/locators.md)** - Element locators
- **[expect](browser/expect.md)** - Browser expectations
- **[orchestratorScripts](browser/orchestratorscripts.md)** - Orchestrator scripts
- **[detailsPanelPosition](browser/detailspanelposition.md)** - Details panel position
- **[playwright](browser/playwright.md)** - Playwright options
- **[webdriverio](browser/webdriverio.md)** - WebdriverIO options
- **[trackUnhandledErrors](browser/trackunhandlederrors.md)** - Unhandled errors
