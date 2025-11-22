# Error Handling

The library uses a combination of return values and exceptions to handle errors.

## Connection Errors

- **Initialization Failure**: `initialize()` or `initControl()` methods will return `false` if the connection cannot be established or verified.
- **Network Errors**: Lower-level network issues (timeouts, unreachable host) are often caught and logged to the console, with the method returning `null` or `false`.
- **Keep-Alive Failures**: The TCP client maintains a keep-alive loop. If it fails repeatedly, the connection is considered lost, and the client may attempt to reconnect or stop the keep-alive process.

## API Errors

- **HTTP Status Codes**: The `FiveMClient` checks HTTP status codes. Non-200 responses are treated as failures.
- **Printer Error Codes**: The `FFMachineInfo` object contains an `ErrorCode` property. This string comes directly from the printer and indicates internal hardware or firmware errors (e.g., "File Error", "Sensor Error").

## Best Practices

1. **Check Return Values**: Most control methods return a `boolean` indicating success or failure. Always check this result.
   ```typescript
   if (!await client.control.setLedOn()) {
       console.error("Failed to turn on LED");
   }
   ```

2. **Handle Nulls**: Data retrieval methods (like `info.get()`) may return `null` if the request fails.
   ```typescript
   const status = await client.info.get();
   if (status) {
       console.log(status.Status);
   } else {
       console.log("Could not retrieve status");
   }
   ```

3. **Verify Connection**: Before performing critical operations, you can use `client.verifyConnection()` to ensure the printer is still reachable.

4. **Try-Catch**: When using methods that perform file I/O (like `uploadFile`), wrap calls in a `try-catch` block to handle file system errors.
