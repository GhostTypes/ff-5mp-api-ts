/**
 * @fileoverview Standalone test script for verifying printer firmware version via HTTP and TCP APIs.
 */
// src/firmware-test.ts
import { FiveMClient } from './index';

async function testFirmwareVersion() {
  // Printer connection details
  const ipAddress = '192.168.0.145';
  const serialNumber = 'SNMQRE9400951';
  const checkCode = '0e35a229';

  console.log('=== FlashForge Firmware Version Test ===');
  console.log(`Connecting to printer at ${ipAddress}...`);

  try {
    // Create and initialize the client
    const client = new FiveMClient(ipAddress, serialNumber, checkCode);

    const connected = await client.initialize();
    if (!connected) {
      console.error('Failed to connect to the printer. Check your connection details.');
      return;
    }

    console.log('Connected successfully!');

    // Test HTTP API
    console.log('\n--- HTTP API Results ---');
    const info = await client.info.get();
    if (info) {
      console.log(`HTTP API Firmware Version: ${info.FirmwareVersion}`);
      console.log(`HTTP API Printer Name: ${info.Name}`);
    } else {
      console.error('Failed to retrieve printer information via HTTP API.');
    }

    // Test Legacy TCP API
    console.log('\n--- Legacy TCP API Results ---');
    const tcpInfo = await client.tcpClient.getPrinterInfo();
    if (tcpInfo) {
      console.log(`TCP API Firmware Version: ${tcpInfo.FirmwareVersion}`);
      console.log(`TCP API Machine Name: ${tcpInfo.Name}`);
      console.log(`TCP API Machine Type: ${tcpInfo.TypeName}`);
    } else {
      console.error('Failed to retrieve printer information via TCP API.');
    }

    // Clean up
    console.log('\nCleaning up connection...');
    await client.dispose();
    console.log('Connection closed.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Force exit to ensure the process terminates
    process.exit(0);
  }
}

// Run the test
testFirmwareVersion();
