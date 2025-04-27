// src/test.ts
import { FiveMClient } from './index';
import { FlashForgePrinterDiscovery, FlashForgePrinter } from './index';

async function testPrinterDiscovery() {
    console.log('=== FlashForge Printer Discovery Test ===');

    try {
        console.log('Starting printer discovery...');
        const discovery = new FlashForgePrinterDiscovery();

        // Discover printers with a 15-second timeout, 2-second idle timeout, and 2 retries
        const printers = await discovery.discoverPrintersAsync(15000, 2000, 2);

        if (printers.length > 0) {
            console.log(`\nFound ${printers.length} printer(s) on the network:`);

            printers.forEach((printer, index) => {
                console.log(`\nPrinter #${index + 1}:`);
                console.log(`  Name: ${printer.name}`);
                console.log(`  Serial Number: ${printer.serialNumber}`);
                console.log(`  IP Address: ${printer.ipAddress}`);
            });
        } else {
            console.log('\nNo printers found on the network.');
        }
    } catch (error) {
        console.error('\nError during printer discovery:', error);
    }
}

// Run the test
runTest().catch(error => {
    console.error('Unhandled error in test:', error);
});


async function runTest() {
    // Replace these values with your actual printer information
    const ipAddress = '192.168.0.208'; // Replace with your printer's IP
    const serialNumber = 'SNMOMC9900728'; // Replace with your printer's serial number
    const checkCode = 'e5c2bf77'; // Replace with your printer's check code

    console.log('=== FlashForge API Test ===');
    console.log(`Attempting to connect to printer at ${ipAddress}`);

    try {
        // Create the client
        const client = new FiveMClient(ipAddress, serialNumber, checkCode);
        console.log('Client created.');

        // Initialize the client and verify connection first
        console.log('Initializing connection...');
        const connected = await client.initialize();
        console.log(`Connection initialized: ${connected}`);

        if (!connected) {
            console.error('Failed to connect to the printer. Check your connection details.');
            return;
        }

        // Then proceed with other operations
        console.log('Initializing control...');
        const controlInitialized = await client.initControl();
        console.log(`Control initialized: ${controlInitialized}`);

        // Get printer info
        console.log('Getting printer information...');
        const info = await client.info.get();

        if (info) {
            console.log('Printer Information:');
            console.log(`- Name: ${info.Name}`);
            console.log(`- Firmware: ${info.FirmwareVersion}`);
            console.log(`- Status: ${info.Status}`);
            console.log(`- Current State: ${MachineState[info.MachineState]}`);
            console.log(`- Hot End Temperature: ${info.Extruder.current}°C`);
            console.log(`- Bed Temperature: ${info.PrintBed.current}°C`);

            if (info.Status === 'printing') {
                console.log('\nPrinter is printing:');
                console.log(`- Current file: ${info.PrintFileName}`);
                console.log(`- Progress: ${info.PrintProgressInt}%`);
                console.log(`- Current layer: ${info.CurrentPrintLayer} of ${info.TotalPrintLayers}`);
                console.log(`- Estimated time remaining: ${info.PrintEta}`);
            }

            await client.control.setLedOff();

        } else {
            console.error('Failed to get printer information!');
        }

        // Close the connection
        //console.log('\nTest completed. Closing connection...');
        //client.dispose();
        //console.log('Connection closed.');

    } catch (error: unknown) {
        const err = error as Error;
        console.error(`Test failed with error: ${err.message}`);
        console.error(err.stack);
    }
}

// From your enums
enum MachineState {
    Ready,
    Busy,
    Calibrating,
    Error,
    Heating,
    Printing,
    Pausing,
    Paused,
    Cancelled,
    Completed,
    Unknown
}

// Run the test
//runTest().catch(error => {
//    console.error('Unhandled error in test:', error);
//});